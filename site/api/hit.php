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
$keyFile = $dir . '/analytics.key';
$secret = @file_get_contents($keyFile);
if (!is_string($secret) || strlen($secret) < 16) {
    $secret = bin2hex(random_bytes(24));
    @file_put_contents($keyFile, $secret, LOCK_EX);
    @chmod($keyFile, 0600);
}

$day = gmdate('Y-m-d');
$ip  = $_SERVER['REMOTE_ADDR'] ?? '';
$visitor = substr(hash('sha256', $ip . '|' . $ua . '|' . $day . '|' . $secret), 0, 16);

try {
    $db = new PDO('sqlite:' . $dir . '/analytics.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $db->exec('PRAGMA journal_mode=WAL;');
    $db->exec('CREATE TABLE IF NOT EXISTS hits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL, day TEXT NOT NULL, path TEXT NOT NULL,
        ref TEXT, visitor TEXT NOT NULL
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_hits_day ON hits(day)');
    $st = $db->prepare('INSERT INTO hits (ts,day,path,ref,visitor) VALUES (?,?,?,?,?)');
    $st->execute([gmdate('c'), $day, $path, $refHost, $visitor]);
} catch (Throwable $e) {
    // Analytics must never affect the visitor — swallow all errors.
}
