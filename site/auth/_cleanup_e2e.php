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
    json_out(true, [
        'mode'    => 'dry-run',
        'pattern' => TEST_PATTERN,
        'matched' => array_map(fn($u) => ['email' => $u['email'], 'created_at' => $u['created_at']], $targets),
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
