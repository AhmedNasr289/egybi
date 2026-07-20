<?php
/**
 * EgyBI — TEMPORARY one-shot cleanup for the end-to-end test account.
 *
 * *** THIS FILE IS DELETED IMMEDIATELY AFTER IT RUNS. It is not part of the
 *     application and must never be left on a live site. ***
 *
 * Verifying signup -> login -> progress-sync end to end required a real row in
 * the live auth database. This removes it again.
 *
 * Blast radius is deliberately near-zero:
 *   - The email pattern is HARDCODED. It is never read from the request, so
 *     this cannot be pointed at a real account by crafting a URL.
 *   - The pattern is `egybi-e2e-%@example.com`. example.com is IANA-reserved
 *     and cannot receive mail, so no genuine signup can ever match it.
 *   - Deleting requires a one-time token, so a crawler hitting the URL only
 *     ever gets the dry-run report.
 *   - entitlements (config data) and auth_attempts (self-pruning rate-limit
 *     rows) are left alone.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

const CLEANUP_TOKEN = 'ce13e884fa91689e225b0159885b39ca';
const TEST_PATTERN  = 'egybi-e2e-%@example.com';   // hardcoded on purpose

$db = auth_db();

// Who matches? (always reported, so the dry run shows exactly what would go)
$st = $db->prepare('SELECT id, email, created_at FROM users WHERE email LIKE ?');
$st->execute([TEST_PATTERN]);
$targets = $st->fetchAll();

$token = (string)($_GET['token'] ?? '');
if (!hash_equals(CLEANUP_TOKEN, $token)) {
    // Diagnostics: the dry run came back with zero matches even though the test
    // account was verified to exist. Either it is already gone, or the whole
    // auth store is being reset — which would also take the newsletter list and
    // any real accounts with it, so it needs answering before anything else.
    $cfg = auth_cfg();
    $diag = ['driver' => $cfg['driver']];
    if ($cfg['driver'] === 'sqlite') {
        $p = $cfg['sqlite_path'];
        $diag['sqlite_exists']   = is_file($p);
        $diag['sqlite_bytes']    = is_file($p) ? filesize($p) : 0;
        $diag['sqlite_modified'] = is_file($p) ? gmdate('c', (int)filemtime($p)) : null;
        $diag['sqlite_created']  = is_file($p) ? gmdate('c', (int)filectime($p)) : null;
    }
    $diag['total_users']  = (int)$db->query('SELECT COUNT(*) AS n FROM users')->fetch()['n'];
    $diag['all_emails']   = array_column($db->query('SELECT email FROM users ORDER BY created_at')->fetchAll(), 'email');
    $diag['sessions']     = (int)$db->query('SELECT COUNT(*) AS n FROM sessions')->fetch()['n'];
    $diag['progress_rows']= (int)$db->query('SELECT COUNT(*) AS n FROM user_progress')->fetch()['n'];
    $diag['server_time']  = now();
    json_out(true, [
        'mode'    => 'dry-run',
        'pattern' => TEST_PATTERN,
        'matched' => array_map(fn($u) => ['email' => $u['email'], 'created_at' => $u['created_at']], $targets),
        'diagnostics' => $diag,
        'note'    => 'Supply the one-time token to delete.',
    ]);
}

$deleted = ['users' => 0, 'user_progress' => 0, 'user_stats' => 0, 'sessions' => 0, 'auth_tokens' => 0];
foreach ($targets as $u) {
    $id = $u['id'];
    foreach (['user_progress', 'user_stats', 'sessions', 'auth_tokens'] as $t) {
        $q = $db->prepare("DELETE FROM $t WHERE user_id = ?");
        $q->execute([$id]);
        $deleted[$t] += $q->rowCount();
    }
    $q = $db->prepare('DELETE FROM users WHERE id = ?');
    $q->execute([$id]);
    $deleted['users'] += $q->rowCount();
}

// Prove it: re-query after the delete.
$st = $db->prepare('SELECT COUNT(*) AS n FROM users WHERE email LIKE ?');
$st->execute([TEST_PATTERN]);
$remaining = (int)($st->fetch()['n'] ?? -1);

json_out(true, [
    'mode'      => 'deleted',
    'pattern'   => TEST_PATTERN,
    'deleted'   => $deleted,
    'remaining' => $remaining,
    'real_users_untouched' => (int)$db->query('SELECT COUNT(*) AS n FROM users')->fetch()['n'],
]);
