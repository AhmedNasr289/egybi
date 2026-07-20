<?php
/**
 * EgyBI — Community ideas & comments (WRITE + moderated READ endpoint).
 *
 * The second, and only other, place the site writes anything (alongside
 * newsletter.php). It lets visitors submit an idea/comment, and serves back
 * ONLY entries a human has approved — nothing a stranger posts appears publicly
 * until it is moderated, which keeps the page safe from spam and abuse.
 *
 * Storage: ../_private/community.jsonl  (append-only, outside any served path;
 * also Deny *.jsonl in .htaccess as defence in depth). Each line is a JSON
 * object: { id, name, message, ts, iph, approved }.  Approved-only is the
 * default so moderation is opt-in-safe.
 *
 * TO MODERATE: open `api/moderate.php?key=<ANALYTICS_KEY>`. Rows live in MySQL
 * now, so the old instruction here -- "open the file and set approved: true" --
 * pointed at a store that no longer holds the data, and for a while there was
 * no way to publish or delete a submission at all.
 *
 * POST fields: message (required) | name (optional) | website (honeypot, empty)
 * GET:         returns { ok, items: [ { name, message, ts } ] }  (approved only)
 * Response:    JSON { ok: bool, message?: string, items?: array }
 *
 * No-server fallback (embed GitHub Discussions via Giscus, or Disqus) is
 * documented in backend/DEPLOY.md — the frontend degrades gracefully without it.
 */
header('Content-Type: application/json; charset=utf-8');

$allowed = getenv('COMMUNITY_ORIGIN') ?: '';
if ($allowed !== '') {
    header('Access-Control-Allow-Origin: ' . $allowed);
}

$dir  = __DIR__ . '/_private';
$file = $dir . '/community.jsonl';

/**
 * Submissions used to live only in that JSONL file. It sits in a gitignored
 * `_private/` folder inside public_html, and Hostinger's deploy replaces
 * public_html from the repository — so every push deleted it, taking every
 * community note with it, silently. Rows in the shared database are outside the
 * deploy path and survive. The file remains a fallback for hosts with no DB.
 */
function community_store(): ?PDO
{
    static $db = false;
    if ($db !== false) return $db;
    $db = null;
    $lib = __DIR__ . '/../auth/lib.php';
    if (is_file($lib)) {
        require_once $lib;
        $db = durable_db();
        if ($db) {
            try {
                $db->exec(db_is_mysql()
                    ? "CREATE TABLE IF NOT EXISTS community_notes (
                         id VARCHAR(16) NOT NULL, name VARCHAR(64) NOT NULL,
                         message TEXT NOT NULL, created_at VARCHAR(32) NOT NULL,
                         ip_hash VARCHAR(32) NULL, approved TINYINT NOT NULL DEFAULT 0,
                         PRIMARY KEY (id), KEY idx_comm_approved (approved)
                       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
                    : "CREATE TABLE IF NOT EXISTS community_notes (
                         id TEXT PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL,
                         created_at TEXT NOT NULL, ip_hash TEXT,
                         approved INTEGER NOT NULL DEFAULT 0)");
            } catch (Throwable $e) {
                error_log('[EgyBI] community table init failed: ' . $e->getMessage());
                $db = null;
            }
        }
    }
    return $db;
}

function out(bool $ok, $payload = null, int $code = 200): void
{
    http_response_code($code);
    if (is_array($payload)) {
        echo json_encode(array_merge(['ok' => $ok], $payload));
    } else {
        echo json_encode(['ok' => $ok, 'message' => (string)$payload]);
    }
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ---- READ: return only approved submissions (safe to show publicly) ----------
if ($method === 'GET') {
    $items = [];
    $cdb = community_store();
    if ($cdb) {
        try {
            $rows = $cdb->query('SELECT name, message, created_at FROM community_notes WHERE approved = 1 ORDER BY created_at DESC')
                        ->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $items[] = ['name' => (string)$r['name'], 'message' => (string)$r['message'], 'ts' => (string)$r['created_at']];
            }
            out(true, ['items' => $items]);
        } catch (Throwable $e) { /* fall through to the file */ }
    }
    if (is_file($file)) {
        $fh = fopen($file, 'r');
        if ($fh) {
            while (($line = fgets($fh)) !== false) {
                $rec = json_decode($line, true);
                if (is_array($rec) && !empty($rec['approved'])) {
                    $items[] = [
                        'name'    => (string)($rec['name'] ?? 'Anonymous'),
                        'message' => (string)($rec['message'] ?? ''),
                        'ts'      => (string)($rec['ts'] ?? ''),
                    ];
                }
            }
            fclose($fh);
        }
    }
    // newest first
    $items = array_reverse($items);
    out(true, ['items' => $items]);
}

// ---- WRITE: accept a new submission (stored unapproved) ----------------------
if ($method !== 'POST') {
    out(false, 'Send a POST request to submit, or GET to read approved posts.', 405);
}

// Throttle. Moderation means nothing a stranger posts appears publicly, but an
// unthrottled write still lets an attacker flood the table and the moderation
// queue -- and this table now shares a database with auth, so filling the quota
// takes signup and login down with it.
$ipRate = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|egybi'), 0, 16);
$libRate = __DIR__ . '/../auth/lib.php';
if (is_file($libRate)) {
    require_once $libRate;
    if (function_exists('rate_ok_key') && !rate_ok_key('cm:' . $ipRate, 'community', 5, 60)) {
        out(false, 'Too many submissions — please try again later.', 429);
    }
}

// Accept form-encoded or JSON bodies.
$message = trim((string)($_POST['message'] ?? ''));
$name    = trim((string)($_POST['name'] ?? ''));
$hp      = trim((string)($_POST['website'] ?? ''));
if ($message === '') {
    $raw = json_decode(file_get_contents('php://input') ?: '', true);
    if (is_array($raw)) {
        $message = trim((string)($raw['message'] ?? ''));
        $name    = trim((string)($raw['name'] ?? $name));
        $hp      = trim((string)($raw['website'] ?? $hp));
    }
}

// Honeypot: real users never fill the hidden "website" field. Friendly success,
// store nothing — the bot learns nothing.
if ($hp !== '') {
    out(true, 'Thanks — your note has been received for review.');
}

// Basic validation + sane length caps (avoid giant / empty payloads).
$len = function_exists('mb_strlen') ? mb_strlen($message) : strlen($message);
if ($len < 3) {
    out(false, 'Please write a little more before sending.', 422);
}
if ($len > 1500) {
    out(false, 'That is a bit long — please keep it under 1500 characters.', 422);
}
$nameLen = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);
if ($nameLen > 60) {
    $name = function_exists('mb_substr') ? mb_substr($name, 0, 60) : substr($name, 0, 60);
}
// Strip control characters (keep normal whitespace) so nothing odd is stored.
$message = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $message);
$name    = preg_replace('/[\x00-\x1F]/u', '', $name);
if ($name === '') {
    $name = 'Anonymous';
}

$ipHash = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|egybi'), 0, 16);

// Primary path: the durable database. approved = 0, so a note stays hidden until
// a human clears it — same moderation rule as before, just in a store that is
// not deleted by the next deploy.
$cdb = community_store();
if ($cdb) {
    try {
        $cdb->prepare('INSERT INTO community_notes (id,name,message,created_at,ip_hash,approved) VALUES (?,?,?,?,?,0)')
            ->execute([bin2hex(random_bytes(6)), $name, $message, gmdate('c'), $ipHash]);
        out(true, 'Thank you — your note has been received and will appear once a moderator approves it.');
    } catch (Throwable $e) {
        error_log('[EgyBI] community DB write failed, falling back to file: ' . $e->getMessage());
    }
}

error_log('[EgyBI] community: storing to a file under _private/, which the next '
        . 'deploy will DELETE. Configure the AUTH_DB_* env vars so notes persist.');

if (!is_dir($dir)) {
    @mkdir($dir, 0700, true);
}

// Append atomically. Every field is JSON-encoded, so nothing a user types can be
// interpreted as code downstream. approved:false => hidden until a human clears it.
$record = json_encode([
    'id'       => bin2hex(random_bytes(6)),
    'name'     => $name,
    'message'  => $message,
    'ts'       => gmdate('c'),
    'iph'      => substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|egybi'), 0, 16),
    'approved' => false,
], JSON_UNESCAPED_UNICODE);

$ok = @file_put_contents($file, $record . "\n", FILE_APPEND | LOCK_EX);
if ($ok === false) {
    out(false, 'We could not save your note right now. Please try again later.', 500);
}

out(true, 'Thank you — your note has been received and will appear once a moderator approves it.');
