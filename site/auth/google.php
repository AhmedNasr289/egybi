<?php
/**
 * EgyBI — "Continue with Google" (Google Identity Services, server-verified).
 *
 * Actions:
 *   GET  ?action=nonce   -> issue a single-use nonce for the GIS call
 *   POST ?action=signin  -> {credential, nonce} : verify, link-or-create, session
 *
 * Config-gated: with no `google_client_id` in _private/config.php this endpoint
 * refuses everything and the client never renders a button. Nothing half-wired.
 *
 * ── ACCOUNT LINKING POLICY (the security decision worth reading) ──────────────
 * When a Google sign-in arrives for an email that already has a PASSWORD account,
 * we link the two — but ONLY if Google asserts `email_verified: true`.
 *
 * Why link at all: refusing would strand the user. They own that mailbox, they
 * own the EgyBI account, and forcing them to remember which button they first
 * used is the kind of friction that loses the signup. Creating a second account
 * is not an option either — the email index is unique, and split XP/streaks
 * across two accounts is worse than any login friction.
 *
 * Why ONLY when verified: `email_verified: false` means Google has NOT proven the
 * person controls that mailbox — it can happen on some Workspace domains. Linking
 * on an unverified claim would let anyone who creates a Google account carrying
 * someone else's address walk straight into that person's EgyBI account. That is
 * a full takeover, so this path refuses and tells them to sign in with their
 * password instead. A verified claim is exactly the proof our own emailed
 * verification link provides, so accepting it is consistent, not a shortcut.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require __DIR__ . '/google_verify.php';

$cfg = auth_cfg();
if (!google_enabled()) {
    json_out(false, ['message' => 'Google sign-in is not configured.', 'disabled' => true], 501);
}

$action = $_GET['action'] ?? (body()['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = auth_db();
ensure_google_schema($db);

if ($action === 'nonce') {
    // Single-use, short-lived. Binds one browser attempt to one token, so a
    // captured credential cannot be replayed within its hour-long lifetime.
    if (!rate_ok('gnonce', 30, 15)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);
    $n = rid(16);
    $db->prepare('INSERT INTO auth_tokens (token,user_id,kind,expires_at,used,created_at) VALUES (?,?,?,?,?,?)')
       ->execute([$n, '-', 'gnonce', plus_mins(10), 0, now()]);
    json_out(true, ['nonce' => $n]);
}

if ($action !== 'signin') json_out(false, ['message' => 'Unknown action.'], 404);
if ($method !== 'POST')   json_out(false, ['message' => 'POST required.'], 405);
if (!rate_ok('google', 20, 15)) json_out(false, ['message' => 'Too many attempts — please try again later.'], 429);

$b     = body();
$jwt   = (string)($b['credential'] ?? '');
$nonce = (string)($b['nonce'] ?? '');
if ($jwt === '') json_out(false, ['message' => 'Missing Google credential.'], 400);

// Consume the nonce before verifying, so a replay cannot reuse it even if the
// verification below fails partway.
$expected = '';
if ($nonce !== '' && ctype_xdigit($nonce)) {
    $st = $db->prepare("SELECT * FROM auth_tokens WHERE token=? AND kind='gnonce' AND used=0");
    $st->execute([$nonce]);
    $t = $st->fetch();
    if ($t && strtotime($t['expires_at']) >= time()) {
        $db->prepare('UPDATE auth_tokens SET used=1 WHERE token=?')->execute([$nonce]);
        $expected = $nonce;
    } else {
        json_out(false, ['message' => 'That sign-in attempt expired. Please try again.'], 400);
    }
}

$claims = verify_google_id_token($jwt, trim((string)$cfg['google_client_id']), $expected);
if ($claims === null) json_out(false, ['message' => 'Could not verify that Google sign-in.'], 401);

$email = $claims['email'];
$sub   = $claims['sub'];
$ts    = now();

// 1) Already linked? Match on `sub`, not email — sub is immutable, emails change.
$st = $db->prepare('SELECT * FROM users WHERE google_sub=?');
$st->execute([$sub]);
$u = $st->fetch();

if (!$u) {
    // 2) Existing account on this email?
    $st = $db->prepare('SELECT * FROM users WHERE email=?');
    $st->execute([$email]);
    $existing = $st->fetch();

    if ($existing) {
        if (!$claims['email_verified']) {
            // See the policy note at the top — refusing here is the whole point.
            json_out(false, ['message' => 'An account already uses that email. Please sign in with your password.'], 409);
        }
        $db->prepare('UPDATE users SET google_sub=?, email_verified=1, updated_at=? WHERE id=?')
           ->execute([$sub, $ts, $existing['id']]);
        $u = $existing;
        $u['email_verified'] = 1;
    } else {
        // 3) Brand-new account. pass_hash is the sentinel, never a real hash, so
        //    this account cannot be reached by password until the owner sets one
        //    through the ordinary reset flow.
        $id      = rid();
        $display = 'Scribe-' . strtoupper(substr($id, 0, 4));
        $db->prepare('INSERT INTO users (id,email,pass_hash,email_verified,plan,display_name,created_at,updated_at,google_sub) VALUES (?,?,?,?,?,?,?,?,?)')
           ->execute([$id, $email, PASS_NONE, $claims['email_verified'] ? 1 : 0, 'free', $display, $ts, $ts, $sub]);
        $st = $db->prepare('SELECT * FROM users WHERE id=?');
        $st->execute([$id]);
        $u = $st->fetch();
    }
}

// Same session shape as password login, so the client's existing progress-sync
// and nav-render paths carry XP, streaks and rank through unchanged.
$s = create_session($u['id']);
json_out(true, [
    'csrf' => $s['csrf'],
    'user' => ['email' => $u['email'], 'plan' => $u['plan'], 'name' => $u['display_name'],
               'verified' => (int)$u['email_verified'] === 1],
    'stats' => get_stats($u['id']),
]);
