<?php
/**
 * EgyBI — "The Papyrus" newsletter signup (WRITE endpoint).
 *
 * Deliberately SEPARATE from the read-only knowledge-base API: this is the one
 * place the site writes anything. It appends a validated email + timestamp to an
 * append-only JSONL file (no database write needed, so it runs on any shared
 * PHP host), de-duplicates, and is hardened against spam and injection.
 *
 * Storage: the `newsletter_subscribers` table, via ../auth/lib.php.
 *
 * It used to be an append-only JSONL file at ../_private/newsletter.jsonl. That
 * folder is gitignored, and Hostinger's deployment replaces public_html with the
 * repository contents — so it was not in the repo, and EVERY push deleted it.
 * Real subscriber emails were being destroyed silently, with nothing in the logs
 * and no error on the page. Database rows are outside the deploy path and
 * survive. The file path is kept only as a last-resort fallback for hosts with
 * no database configured, and it now says so in the logs when it is used.
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

// GET ?action=confirm&e=&t= — the double-opt-in landing. Returns a small HTML
// page (not JSON), because a human clicked this link from their inbox.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && ($_GET['action'] ?? '') === 'confirm') {
    $lib = __DIR__ . '/../auth/lib.php';
    if (is_file($lib)) {
        require_once $lib;
        $email = strtolower(trim((string)($_GET['e'] ?? '')));
        $token = trim((string)($_GET['t'] ?? ''));
        $res   = newsletter_confirm($email, $token);
        header('Content-Type: text/html; charset=utf-8');
        echo newsletter_notice_page(
            $res === 'invalid' ? 'Link expired' : 'You are subscribed',
            $res === 'confirmed'
                ? 'Your subscription to The Papyrus is confirmed. Welcome aboard — one letter a month, always a number you did not know.'
                : ($res === 'already'
                    ? 'You are already confirmed — thank you.'
                    : 'This confirmation link is invalid or has expired. Please subscribe again from the site.'));
        exit;
    }
    out(false, 'Confirmation is unavailable right now.', 503);
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

$ipHash = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|egybi'), 0, 16);

// Throttle before writing anything. The honeypot stops naive bots, and CORS
// only governs whether an attacker can READ the reply -- the write still lands.
// Unthrottled, a hidden auto-submitting form on any page subscribes arbitrary
// addresses, which mail-bombs a victim from our domain and burns the sending
// reputation this project spent real effort establishing.
$libRate = __DIR__ . '/../auth/lib.php';
if (is_file($libRate)) {
    require_once $libRate;
    if (function_exists('rate_ok_key') && !rate_ok_key('nl:' . $ipHash, 'newsletter', 5, 60)) {
        out(false, 'Too many requests — please try again later.', 429);
    }
}

// Primary path: the database, which survives deployments.
$lib = __DIR__ . '/../auth/lib.php';
if (is_file($lib)) {
    require_once $lib;
    $res = newsletter_add($email, $ipHash);
    if ($res === 'added') {
        // Double opt-in: the address is inert until confirmed. Email the link.
        $tok = newsletter_token($email);
        if ($tok) {
            $mailer = __DIR__ . '/../auth/mailer.php';
            if (is_file($mailer)) {
                require_once $mailer;
                @send_mail(
                    $email,
                    'Confirm your subscription to The Papyrus',
                    mail_template(
                        'One more step',
                        'Confirm your email to start receiving The Papyrus — EgyBI\'s monthly letter about Egypt, told through its data. If you did not request this, ignore this message and nothing will be sent.',
                        'Confirm my subscription',
                        newsletter_confirm_url($email, $tok)));
            }
        }
        out(true, 'Almost there — check your inbox to confirm your subscription.');
    }
    if ($res === 'duplicate') out(true, 'You are already on the list — thank you.');
    // 'error' falls through to the file, so a database hiccup never loses a signup.
    error_log('[EgyBI] newsletter: database write failed, falling back to file storage.');
}

// Fallback only. Anything written here is lost on the next deploy, so say so
// loudly rather than letting it look like it worked.
error_log('[EgyBI] newsletter: storing to a file under _private/, which the next '
        . 'deploy will DELETE. Configure the AUTH_DB_* env vars so signups persist.');

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
$record = json_encode(['email' => $email, 'ts' => gmdate('c'), 'iph' => $ipHash]);
$ok = @file_put_contents($file, $record . "\n", FILE_APPEND | LOCK_EX);
if ($ok === false) {
    out(false, 'We could not save your signup right now. Please try again later.', 500);
}

out(true, 'You are subscribed to The Papyrus. Welcome aboard.');
