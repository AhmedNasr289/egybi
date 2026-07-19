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
 * object: { id, name, message, ts, iph, approved }.  To approve a submission,
 * open the file and set "approved": true on its line (or use any small admin
 * step you prefer). Approved-only is the default so moderation is opt-in-safe.
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
