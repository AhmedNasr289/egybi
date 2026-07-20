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
    require_same_origin();
    $b = body();
    if (trim((string)($b['website'] ?? '')) !== '') json_out(true, ['message' => 'Check your email to verify your account.']); // honeypot
    if (!rate_ok('signup', 8, 60)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $pw    = (string)($b['password'] ?? '');
    if (!valid_email($email)) json_out(false, ['message' => 'Please enter a valid email address.'], 422);
    if (strlen($pw) < 8) json_out(false, ['message' => 'Password must be at least 8 characters.'], 422);
    // Upper bound: the bcrypt fallback silently truncates at 72 bytes, so a
    // longer passphrase would not be the password the user thinks it is.
    if (strlen($pw) > 128) json_out(false, ['message' => 'Password must be 128 characters or fewer.'], 422);

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
        // Prefix only, and only when SMTP is unconfigured — same reasoning as the
        // reset path: no live token should sit in a file when it is also emailed.
        if (auth_cfg()['smtp_host'] === '') {
            @file_put_contents(__DIR__ . '/_private/mail.log',
                now() . " VERIFY " . $email . " token=" . substr($token, 0, 8) . "...\n",
                FILE_APPEND | LOCK_EX);
        }
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
    require_same_origin();
    if (!rate_ok('login', 10, 15)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    $b = body();
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $pw    = (string)($b['password'] ?? '');
    // Second, per-account throttle. The IP limit above is bypassed entirely by a
    // botnet or an IPv6 /64; this one bounds attempts against a single target
    // regardless of how many source addresses the attacker controls.
    if ($email !== '' && !rate_ok_key(account_bucket($email), 'login', 8, 60)) {
        json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    }
    $st = $db->prepare('SELECT * FROM users WHERE email=?'); $st->execute([$email]);
    $u = $st->fetch();
    // Constant-ish work whether or not the user exists (mitigate timing/enumeration).
    // dummy_hash() deliberately matches the algorithm hash_password() produces on
    // this host -- see the note there. The previous hardcoded bcrypt constant did
    // not, which made real accounts measurably slower than unknown ones.
    $hash = $u['pass_hash'] ?? dummy_hash();
    // A Google-only account stores a sentinel, not a hash. password_verify()
    // already returns false for it, but rejecting explicitly documents the case
    // and guarantees it can never be reached by password. The reply stays the
    // generic one on purpose — saying "use Google instead" here would reveal
    // that the address is registered, which is the enumeration leak this
    // endpoint is built to avoid. Such users can still adopt a password through
    // the ordinary "Forgot password" flow.
    // The sentinel is not a hash, so password_verify() would bail immediately and
    // return in ~0ms -- making Google-only accounts the fastest response of all
    // and trivially distinguishable from both real and unknown accounts. Burn an
    // equivalent verify against the dummy so this branch costs what the others do.
    if ($hash === PASS_NONE) { password_verify($pw, dummy_hash()); $okpw = false; }
    else $okpw = password_verify($pw, $hash);
    if (!$u || !$okpw) json_out(false, ['message' => 'Wrong email or password.'], 401);
    // Optional hard gate: block unverified logins only if enabled in config.
    if (auth_cfg()['require_verified'] && (int)$u['email_verified'] !== 1) {
        json_out(false, ['message' => 'Please verify your email first — check your inbox for the link.'], 403);
    }
    $s = create_session($u['id']);
    json_out(true, ['csrf' => $s['csrf'], 'user' => ['email' => $u['email'], 'plan' => $u['plan'], 'name' => $u['display_name'], 'verified' => (int)$u['email_verified'] === 1]]);
}

case 'logout': {
    $s = current_session();
    // $s['id'] is the STORED key (sessions are keyed on a hash of the cookie),
    // so this must use the _key variant, not destroy_session().
    if ($s) { require_csrf($s); destroy_session_key($s['id']); }
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
            // Log a PREFIX only, and only when SMTP is unconfigured (the local-dev
            // case this log exists for). Writing the whole live token on every
            // request meant a single read of this file yielded working reset
            // tokens for every account that had asked in the last 60 minutes.
            // Web access is blocked, but there is no reason to keep the material
            // sitting there when the token is also being emailed.
            if (auth_cfg()['smtp_host'] === '') {
                @file_put_contents(__DIR__ . '/_private/mail.log',
                    now() . " RESET " . $email . " token=" . substr($token, 0, 8) . "...\n",
                    FILE_APPEND | LOCK_EX);
            }
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
    // Upper bound: the bcrypt fallback silently truncates at 72 bytes, so a
    // longer passphrase would not be the password the user thinks it is.
    if (strlen($pw) > 128) json_out(false, ['message' => 'Password must be 128 characters or fewer.'], 422);
    if (!ctype_xdigit($token)) json_out(false, ['message' => 'Invalid reset link.'], 400);
    $st = $db->prepare("SELECT * FROM auth_tokens WHERE token=? AND kind='reset' AND used=0"); $st->execute([$token]);
    $t = $st->fetch();
    if (!$t || strtotime($t['expires_at']) < time()) json_out(false, ['message' => 'This reset link has expired or was already used.'], 400);
    // google_sub is cleared deliberately. Proving control of the mailbox is what
    // a reset establishes, so it must also sever any Google link -- otherwise a
    // squatter who created the account keeps permanent co-ownership alongside
    // the real owner, who has no way to see or remove them. Re-linking Google is
    // one click; silent shared access is not recoverable.
    $db->prepare('UPDATE users SET pass_hash=?, email_verified=1, google_sub=NULL, updated_at=? WHERE id=?')
       ->execute([hash_password($pw), now(), $t['user_id']]);
    $db->prepare('UPDATE auth_tokens SET used=1 WHERE token=?')->execute([$token]);
    destroy_all_sessions($t['user_id']); // force re-login everywhere after a reset
    json_out(true, ['message' => 'Password updated — please sign in.']);
}

case 'me': {
    // The Google client id is a PUBLIC value (it ships in the page on every site
    // that uses GIS), so returning it here is safe and saves a round-trip. When
    // it is empty the client renders no Google button at all.
    $g = ['enabled' => google_enabled(), 'client_id' => google_enabled() ? (string)auth_cfg()['google_client_id'] : ''];
    $u = current_user();
    if (!$u) json_out(true, ['user' => null, 'google' => $g]);
    $s = current_session();
    json_out(true, [
        'user' => ['email' => $u['email'], 'plan' => $u['plan'], 'name' => $u['display_name'], 'verified' => (int)$u['email_verified'] === 1],
        'stats' => get_stats($u['id']),
        'csrf' => $s['csrf'] ?? null,
    ]);
}

case 'rename': {
    if ($method !== 'POST') json_out(false, ['message' => 'POST required.'], 405);
    $s = current_session();
    if (!$s) json_out(false, ['message' => 'Sign in first.'], 401);
    require_csrf($s);
    $name = trim((string)(body()['name'] ?? ''));
    if (!valid_display_name($name)) {
        json_out(false, ['message' => 'Use 3–32 letters, numbers, spaces, - or _.'], 422);
    }
    $db->prepare('UPDATE users SET display_name=?, updated_at=? WHERE id=?')->execute([$name, now(), $s['user_id']]);
    json_out(true, ['name' => $name, 'message' => 'Handle updated.']);
}

case 'health': {
    // Key-gated, same as mail-test. It was public, on the reasoning that driver
    // and row counts give an attacker nothing -- but that was wrong on two
    // counts: put_config_here/deployed_folder return ABSOLUTE server paths
    // (disclosing the hosting account id and the directory layout, which is
    // exactly the material that turns a future file-handling bug into something
    // worse), and schema_errors can carry raw database error text. The row
    // counts are also a free, continuously-pollable business metric.
    //
    // An ungated liveness probe stays available below, so "is the site up?" is
    // still answerable without the key.
    $key = (string)($_GET['key'] ?? '');
    $ak  = analytics_key();
    if (strlen($ak) < 16 || !hash_equals($ak, $key)) {
        json_out(true, ['ok' => true]);   // liveness only, no detail
    }
    $d = storage_durability();
    // Which config was picked up, without disclosing a filesystem path.
    // Report honestly. An earlier version called ANY config outside _private/
    // "durable", including one sitting inside public_html — which a deploy
    // deletes. The real test is whether it is inside the deployed tree.
    $cf = auth_config_file();
    $hint = null;
    if ($cf === null) {
        $cfState = 'none — no egybi-config.php found; using built-in defaults';
        $hint = dirname(deploy_root()) . '/egybi-config.php';
    } elseif (is_inside_deploy($cf)) {
        $cfState = 'EPHEMERAL — the config is inside the deployed folder, so the next push deletes it';
        $hint = dirname(deploy_root()) . '/egybi-config.php';
    } else {
        $cfState = 'durable — config is above the deployed folder and survives deploys';
    }
    $counts = [];
    // community_notes and hits included so every durable store is observable
    // from one place. Their absence is why a disappearance in community_notes
    // could only be noticed by accident.
    foreach (['users', 'user_progress', 'sessions', 'newsletter_subscribers', 'community_notes', 'hits'] as $t) {
        try { $counts[$t] = (int)$db->query("SELECT COUNT(*) AS n FROM $t")->fetch()['n']; }
        catch (Throwable $e) { $counts[$t] = null; }   // table not created yet
    }
    json_out(true, [
        'storage'  => ['driver' => $d['driver'], 'durable' => $d['durable'], 'detail' => $d['why']],
        'config'   => $cfState,
        // Shown only while something needs fixing: the exact absolute path to
        // create, so nobody has to guess which folder "above public_html" means.
        'put_config_here' => $hint,
        'deployed_folder' => $hint ? deploy_root() : null,
        'schema_errors' => schema_errors() ?: 'none',
        'counts'   => $counts,
        'google'   => google_enabled(),
        'mail'     => auth_cfg()['smtp_host'] !== '',
        // Whether the analytics secret comes from durable config. False means it
        // is still falling back to a generated file that each deploy erases,
        // which silently changes the insights ?key= and resets visitor
        // de-duplication. Reports only that it is SET — never the value.
        'analytics_key_set' => analytics_key() !== '',
        'server_time' => now(),
    ]);
}

case 'mail-test': {
    // Prove the SMTP settings actually work, rather than discovering it from a
    // user who never got their verification link.
    //
    // Two hard limits keep this from becoming an open relay:
    //   1. It requires the analytics key — a secret only the owner has.
    //   2. The recipient is NOT taken from the request. It always sends to the
    //      configured mailbox (smtp_user), so this endpoint can only ever mail
    //      the site's own operator, whatever anyone puts in the URL.
    $key = analytics_key();
    if ($key === '' || !hash_equals($key, (string)($_GET['key'] ?? ''))) {
        json_out(false, ['message' => 'Forbidden.'], 403);
    }
    if (!rate_ok('mailtest', 6, 60)) json_out(false, ['message' => 'Too many attempts — try again later.'], 429);

    $c = auth_cfg();
    if ($c['smtp_host'] === '' || $c['smtp_user'] === '' || $c['smtp_pass'] === '') {
        json_out(false, [
            'configured' => false,
            'message' => 'SMTP is not configured. Set smtp_host, smtp_user and smtp_pass in egybi-config.php.',
        ], 400);
    }

    $to = (string)$c['smtp_user'];          // fixed recipient, never from input
    $sent = send_mail($to, 'EgyBI SMTP test — it works',
        mail_template('Mail is working',
            'If you are reading this, EgyBI can send verification and password-reset email through Hostinger SMTP. Nothing else to do.',
            'Open EgyBI', $c['app_url'] . '/'));

    json_out($sent, [
        'configured' => true,
        'sent_to'    => $to,
        'smtp'       => ['host' => $c['smtp_host'], 'port' => $c['smtp_port'], 'user' => $c['smtp_user'], 'from' => $c['mail_from']],
        'error'      => $sent ? null : mail_last_error(),
        'message'    => $sent
            ? 'Handed to the SMTP server. Check that inbox — and check the spam folder.'
            : 'Send failed. The `error` field has the server\'s own reply.',
    ], $sent ? 200 : 502);
}

default:
    json_out(false, ['message' => 'Unknown action.'], 404);
}
