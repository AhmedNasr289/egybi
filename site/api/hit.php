<?php
/**
 * EgyBI — first-party, cookieless page-view beacon.
 *
 * Privacy by design: no cookies, no third parties, no raw IPs stored. A rough
 * "unique visitor" token is a one-way hash of (IP + UA + day + secret) that
 * rotates every day, so visitors can't be tracked across days and the value
 * can't be reversed to an IP. Honours Do-Not-Track and skips known bots.
 * Data lands in api/_private/analytics.sqlite (web-blocked, git-ignored).
 */
declare(strict_types=1);

http_response_code(204); // always answer fast+empty; a beacon ignores the body
header('Content-Type: text/plain');

// Respect Do-Not-Track.
if (($_SERVER['HTTP_DNT'] ?? '') === '1') return;

$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
// Skip obvious bots/crawlers/previewers.
if ($ua === '' || preg_match('~bot|crawl|spider|slurp|bing|preview|monitor|curl|wget|python-requests|headless~i', $ua)) return;

// Payload (sent via sendBeacon as JSON). Fall back to form fields.
$raw = json_decode(file_get_contents('php://input') ?: '', true);
$path = (string)($raw['path'] ?? ($_POST['path'] ?? ''));
$ref  = (string)($raw['ref']  ?? ($_POST['ref']  ?? ''));
// Optional funnel event. Empty = a plain page view. Kept to a short slug so the
// column can never become a free-text sink.
$event = (string)($raw['event'] ?? ($_POST['event'] ?? ''));
$event = substr(preg_replace('~[^a-z0-9_]~', '', strtolower($event)), 0, 40);

// Sanitise path: keep it a short, query-less same-site path.
$path = parse_url($path, PHP_URL_PATH) ?: '/';
$path = substr(preg_replace('~[^a-zA-Z0-9/_.-]~', '', $path), 0, 120);
if ($path === '') $path = '/';

// Keep only the referrer HOST (never full URLs / query strings).
$refHost = $ref !== '' ? (parse_url($ref, PHP_URL_HOST) ?: '') : '';
$refHost = substr(preg_replace('~[^a-zA-Z0-9.-]~', '', $refHost), 0, 80);
$self = $_SERVER['HTTP_HOST'] ?? '';
if ($refHost === $self) $refHost = ''; // internal navigation → treat as direct

$dir = __DIR__ . '/_private';
if (!is_dir($dir)) @mkdir($dir, 0700, true);

// A stable per-install secret so visitor hashes can't be recomputed externally.
// It MUST come from the environment first: it used to live only in
// _private/analytics.key, which every deploy deleted — so the secret was
// regenerated on each push. That silently broke visitor de-duplication (the same
// person counted as new after every deploy) AND changed the ?key= needed to read
// the dashboard, so the bookmarked insights URL stopped working.
$secret = (string)(getenv('ANALYTICS_KEY') ?: '');
if (strlen($secret) < 16) {
    $keyFile = $dir . '/analytics.key';
    $secret = @file_get_contents($keyFile);
    if (!is_string($secret) || strlen($secret) < 16) {
        $secret = bin2hex(random_bytes(24));
        @file_put_contents($keyFile, $secret, LOCK_EX);
        @chmod($keyFile, 0600);
    }
}

$day = gmdate('Y-m-d');
$ip  = $_SERVER['REMOTE_ADDR'] ?? '';
$visitor = substr(hash('sha256', $ip . '|' . $ua . '|' . $day . '|' . $secret), 0, 16);

try {
    // Prefer the shared durable database. The old SQLite file sat in _private/
    // and was destroyed on every deploy, which is why the funnel never showed
    // any data — it was not that nobody visited, it was that the table kept
    // being thrown away.
    $db = null; $mysql = false;
    $lib = __DIR__ . '/../auth/lib.php';
    if (is_file($lib)) {
        require_once $lib;
        $db = durable_db();
        $mysql = $db ? db_is_mysql() : false;
    }
    if (!$db) {
        $db = new PDO('sqlite:' . $dir . '/analytics.sqlite', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $db->exec('PRAGMA journal_mode=WAL;');
    }

    $db->exec($mysql
        ? "CREATE TABLE IF NOT EXISTS hits (
             id BIGINT NOT NULL AUTO_INCREMENT,
             ts VARCHAR(32) NOT NULL, day VARCHAR(10) NOT NULL, path VARCHAR(255) NOT NULL,
             ref VARCHAR(80) NULL, visitor VARCHAR(32) NOT NULL,
             event VARCHAR(40) NOT NULL DEFAULT '',
             PRIMARY KEY (id), KEY idx_hits_day (day), KEY idx_hits_event (event)
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        : "CREATE TABLE IF NOT EXISTS hits (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             ts TEXT NOT NULL, day TEXT NOT NULL, path TEXT NOT NULL,
             ref TEXT, visitor TEXT NOT NULL, event TEXT NOT NULL DEFAULT ''
           )");
    if (!$mysql) {
        $db->exec('CREATE INDEX IF NOT EXISTS idx_hits_day ON hits(day)');
        // Additive migration for installs created before `event` existed.
        $cols = [];
        foreach ($db->query('PRAGMA table_info(hits)') as $c) { $cols[] = $c['name']; }
        if (!in_array('event', $cols, true)) {
            $db->exec("ALTER TABLE hits ADD COLUMN event TEXT NOT NULL DEFAULT ''");
            $db->exec('CREATE INDEX IF NOT EXISTS idx_hits_event ON hits(event)');
        }
    }
    $st = $db->prepare('INSERT INTO hits (ts,day,path,ref,visitor,event) VALUES (?,?,?,?,?,?)');
    $st->execute([gmdate('c'), $day, $path, $refHost, $visitor, $event]);
} catch (Throwable $e) {
    // Analytics must never affect the visitor — swallow all errors.
}
