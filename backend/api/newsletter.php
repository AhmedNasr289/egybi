<?php
/**
 * EgyBI — "The Papyrus" newsletter signup (WRITE endpoint).
 *
 * Deliberately SEPARATE from the read-only knowledge-base API: this is the one
 * place the site writes anything. It appends a validated email + timestamp to an
 * append-only JSONL file (no database write needed, so it runs on any shared
 * PHP host), de-duplicates, and is hardened against spam and injection.
 *
 * Storage: ../_private/newsletter.jsonl  (outside the API folder that gets
 * served; also add a Deny rule for *.jsonl in .htaccess as defence in depth).
 *
 * POST fields:  email (required)  |  website (honeypot — must be empty)
 * Response: JSON { ok: bool, message: string }
 *
 * To use a hosted form service instead (Formspree / Buttondown) and skip this
 * file entirely, see backend/DEPLOY.md — the frontend endpoint is configurable.
 */
header('Content-Type: application/json; charset=utf-8');

// Same-origin only for writes (lock this to the real domain in production).
$allowed = getenv('NEWSLETTER_ORIGIN') ?: '';
if ($allowed !== '') {
    header('Access-Control-Allow-Origin: ' . $allowed);
}

function out(bool $ok, string $msg, int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $msg]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    out(false, 'Send a POST request with an email.', 405);
}

// Accept form-encoded or JSON bodies.
$email   = trim((string)($_POST['email'] ?? ''));
$hp      = trim((string)($_POST['website'] ?? ''));
if ($email === '') {
    $raw = json_decode(file_get_contents('php://input') ?: '', true);
    if (is_array($raw)) {
        $email = trim((string)($raw['email'] ?? ''));
        $hp    = trim((string)($raw['website'] ?? $hp));
    }
}

// Honeypot: real users never fill the hidden "website" field. Bots do.
// Return a friendly success so bots learn nothing, but store nothing.
if ($hp !== '') {
    out(true, 'Thanks for subscribing.');
}

// Emails are ASCII per spec — use plain string funcs so this works even where
// the mbstring extension is not enabled.
$email = strtolower($email);
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    out(false, 'Please enter a valid email address.', 422);
}

$dir  = __DIR__ . '/_private';
$file = $dir . '/newsletter.jsonl';
if (!is_dir($dir)) {
    @mkdir($dir, 0700, true);
}

// De-duplicate (case-insensitive) against the existing store.
if (is_file($file)) {
    $fh = fopen($file, 'r');
    if ($fh) {
        while (($line = fgets($fh)) !== false) {
            $rec = json_decode($line, true);
            if (is_array($rec) && ($rec['email'] ?? '') === $email) {
                fclose($fh);
                out(true, 'You are already on the list — thank you.');
            }
        }
        fclose($fh);
    }
}

// Append atomically. Only whitelisted, JSON-encoded fields are written, so the
// stored email can never be interpreted as code by anything downstream.
$record = json_encode([
    'email' => $email,
    'ts'    => gmdate('c'),
    'iph'   => substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|egybi'), 0, 16),
]);
$ok = @file_put_contents($file, $record . "\n", FILE_APPEND | LOCK_EX);
if ($ok === false) {
    out(false, 'We could not save your signup right now. Please try again later.', 500);
}

out(true, 'You are subscribed to The Papyrus. Welcome aboard.');
