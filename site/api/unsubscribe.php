<?php
/**
 * EgyBI — The Papyrus one-click unsubscribe (WRITE endpoint).
 *
 * Every issue carries a per-subscriber link (`?e=<email>&t=<token>`) and a
 * matching `List-Unsubscribe` header, so a reader can leave in one click — a
 * legal requirement (CAN-SPAM) and a strong deliverability signal.
 *
 *   GET  → a human clicked the footer link → show a small confirmation page.
 *   POST → a mail client's RFC 8058 one-click (List-Unsubscribe-Post) → 200/400,
 *          no body needed.
 *
 * The token is the same per-address capability secret set at signup, compared
 * with hash_equals in lib.php. No account, no session, nothing enumerable.
 */
declare(strict_types=1);

$lib = __DIR__ . '/../auth/lib.php';
if (!is_file($lib)) {
    http_response_code(503);
    echo 'Unsubscribe is unavailable right now.';
    exit;
}
require_once $lib;

$isPost = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
$email  = strtolower(trim((string)($_GET['e'] ?? $_POST['e'] ?? '')));
$token  = trim((string)($_GET['t'] ?? $_POST['t'] ?? ''));

$res = newsletter_unsub($email, $token);

if ($isPost) {
    // One-click (RFC 8058): the mail client only cares about the status code.
    http_response_code($res === 'invalid' ? 400 : 200);
    echo $res === 'invalid' ? 'invalid' : 'unsubscribed';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo newsletter_notice_page(
    $res === 'invalid' ? 'Link expired' : 'Unsubscribed',
    $res === 'unsubscribed'
        ? 'You have been removed from The Papyrus. You will not receive any more issues. Changed your mind? You can always subscribe again from the site.'
        : ($res === 'already'
            ? 'You are already unsubscribed — you will not receive any issues.'
            : 'This unsubscribe link is invalid or has expired. If you keep receiving mail, reply to any issue and we will remove you.'));
