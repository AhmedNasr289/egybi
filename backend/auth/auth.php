<?php
/**
 * EgyBI — Phase 2 auth endpoint (isolated from the read-only KB API).
 * Actions (via ?action= or JSON {action}):
 *   POST signup {email,password,website(honeypot)}   -> create user + verify token
 *   GET  verify {token}                              -> mark email verified
 *   POST login {email,password}                      -> session cookie + csrf
 *   POST logout                                      -> destroy session (CSRF)
 *   POST request-reset {email}                       -> issue reset token (generic reply)
 *   POST reset {token,password}                      -> set new password, kill sessions
 *   GET  me                                          -> current user (or null)
 * Security: Argon2id hashing, prepared statements, HttpOnly+Secure+SameSite
 * cookie, CSRF on state-changing writes, rate limiting, no account enumeration.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require __DIR__ . '/mailer.php';

$action = $_GET['action'] ?? (body()['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = auth_db();

function valid_email(string $e): bool { return strlen($e) <= 254 && (bool)filter_var($e, FILTER_VALIDATE_EMAIL); }

switch ($action) {

case 'signup': {
    if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    $b = body();
    if (trim((string)($b['website'] ?? '')) !== '') json_out(true, ['message' => 'Check your email to verify your account.']); // honeypot
    if (!rate_ok('signup', 8, 60)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $pw    = (string)($b['password'] ?? '');
    if (!valid_email($email)) json_out(false, ['message' => 'Please enter a valid email address.'], 422);
    if (strlen($pw) < 8) json_out(false, ['message' => 'Password must be at least 8 characters.'], 422);

    // Don't leak whether the email exists: reply the same either way.
    $st = $db->prepare('SELECT id FROM users WHERE email=?'); $st->execute([$email]);
    if (!$st->fetch()) {
        $id = rid(); $ts = now();
        // A public, non-PII handle for the leaderboard (users can rename later).
        $display = 'Scribe-' . strtoupper(substr($id, 0, 4));
        $db->prepare('INSERT INTO users (id,email,pass_hash,email_verified,plan,display_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
           ->execute([$id, $email, hash_password($pw), 0, 'free', $display, $ts, $ts]);
        $token = rid(32);
        $db->prepare('INSERT INTO auth_tokens (token,user_id,kind,expires_at,used,created_at) VALUES (?,?,?,?,?,?)')
           ->execute([$token, $id, 'verify', plus_mins(1440), 0, $ts]);
        // Send the verification email (real send when SMTP is configured in
        // _private/config.php; otherwise the mailer logs it for dev/manual use).
        $link = auth_cfg()['app_url'] . '/?verify=' . $token;
        @file_put_contents(__DIR__ . '/_private/mail.log', now() . " VERIFY " . $email . " token=" . $token . "\n", FILE_APPEND | LOCK_EX);
        send_mail($email, 'Verify your EgyBI account',
            mail_template('Welcome to the House of Life',
                'Confirm your email to start solving real, auto-graded SQL challenges on cited Egyptian data. This link expires in 24 hours.',
                'Verify my email', $link));
    }
    json_out(true, ['message' => 'Almost there — check your email to verify your account.']);
}

case 'verify': {
    $token = (string)($_GET['token'] ?? (body()['token'] ?? ''));
    if (!ctype_xdigit($token)) json_out(false, ['message' => 'Invalid verification link.'], 400);
    $st = $db->prepare("SELECT * FROM auth_tokens WHERE token=? AND kind='verify' AND used=0"); $st->execute([$token]);
    $t = $st->fetch();
    if (!$t || strtotime($t['expires_at']) < time()) json_out(false, ['message' => 'This link has expired or was already used.'], 400);
    $db->prepare('UPDATE users SET email_verified=1, updated_at=? WHERE id=?')->execute([now(), $t['user_id']]);
    $db->prepare('UPDATE auth_tokens SET used=1 WHERE token=?')->execute([$token]);
    json_out(true, ['message' => 'Email verified — you can now sign in.']);
}

case 'login': {
    if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    if (!rate_ok('login', 10, 15)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    $b = body();
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $pw    = (string)($b['password'] ?? '');
    $st = $db->prepare('SELECT * FROM users WHERE email=?'); $st->execute([$email]);
    $u = $st->fetch();
    // Constant-ish work whether or not the user exists (mitigate timing/enumeration).
    // A valid bcrypt hash of a random string, so password_verify does real work
    // regardless of whether Argon2 is compiled in on this host.
    $hash = $u['pass_hash'] ?? '$2y$12$U20Hyu2lJ.VTfmLWQAFk1eyBZYN1r/XVoupII2lojHCLajPCjQXdK';
    $okpw = password_verify($pw, $hash);
    if (!$u || !$okpw) json_out(false, ['message' => 'Wrong email or password.'], 401);
    $s = create_session($u['id']);
    json_out(true, ['csrf' => $s['csrf'], 'user' => ['email' => $u['email'], 'plan' => $u['plan'], 'verified' => (int)$u['email_verified'] === 1]]);
}

case 'logout': {
    $s = current_session();
    if ($s) { require_csrf($s); destroy_session($s['id']); }
    clear_session_cookie();
    json_out(true, ['message' => 'Signed out.']);
}

case 'request-reset': {
    if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    if (!rate_ok('reset', 6, 60)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    $email = strtolower(trim((string)(body()['email'] ?? '')));
    if (valid_email($email)) {
        $st = $db->prepare('SELECT id FROM users WHERE email=?'); $st->execute([$email]);
        $u = $st->fetch();
        if ($u) {
            $token = rid(32);
            $db->prepare('INSERT INTO auth_tokens (token,user_id,kind,expires_at,used,created_at) VALUES (?,?,?,?,?,?)')
               ->execute([$token, $u['id'], 'reset', plus_mins(60), 0, now()]);
            $link = auth_cfg()['app_url'] . '/?reset=' . $token;
            @file_put_contents(__DIR__ . '/_private/mail.log', now() . " RESET " . $email . " token=" . $token . "\n", FILE_APPEND | LOCK_EX);
            send_mail($email, 'Reset your EgyBI password',
                mail_template('Reset your password',
                    'Tap the button to choose a new password. This link expires in 60 minutes. If you did not ask for this, just ignore this email.',
                    'Set a new password', $link));
        }
    }
    // Always the same reply — never reveal whether an account exists.
    json_out(true, ['message' => 'If that email has an account, a reset link is on its way.']);
}

case 'reset': {
    if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    $b = body();
    $token = (string)($b['token'] ?? '');
    $pw = (string)($b['password'] ?? '');
    if (strlen($pw) < 8) json_out(false, ['message' => 'Password must be at least 8 characters.'], 422);
    if (!ctype_xdigit($token)) json_out(false, ['message' => 'Invalid reset link.'], 400);
    $st = $db->prepare("SELECT * FROM auth_tokens WHERE token=? AND kind='reset' AND used=0"); $st->execute([$token]);
    $t = $st->fetch();
    if (!$t || strtotime($t['expires_at']) < time()) json_out(false, ['message' => 'This reset link has expired or was already used.'], 400);
    $db->prepare('UPDATE users SET pass_hash=?, email_verified=1, updated_at=? WHERE id=?')
       ->execute([hash_password($pw), now(), $t['user_id']]);
    $db->prepare('UPDATE auth_tokens SET used=1 WHERE token=?')->execute([$token]);
    destroy_all_sessions($t['user_id']); // force re-login everywhere after a reset
    json_out(true, ['message' => 'Password updated — please sign in.']);
}

case 'me': {
    $u = current_user();
    if (!$u) json_out(true, ['user' => null]);
    $s = current_session();
    json_out(true, [
        'user' => ['email' => $u['email'], 'plan' => $u['plan'], 'verified' => (int)$u['email_verified'] === 1],
        'stats' => get_stats($u['id']),
        'csrf' => $s['csrf'] ?? null,
    ]);
}

default:
    json_out(false, ['message' => 'Unknown action.'], 404);
}
