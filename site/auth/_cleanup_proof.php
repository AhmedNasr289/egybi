<?php
/**
 * EgyBI — TEMPORARY one-shot cleanup for the durability-proof test rows.
 * *** DELETED IN THE VERY NEXT COMMIT. Not part of the application. ***
 *
 * Proving that data now survives a deploy required creating real rows in the
 * live database. This removes exactly those rows and nothing else:
 *   - users matching  durability-proof-%@example.com
 *   - the subscriber  papyrus-proof@example.com
 *
 * Both patterns are HARDCODED and never read from the request, and example.com
 * is IANA-reserved so no genuine signup can match. Deleting needs a one-time
 * token; without it this only reports what it would remove.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

const CLEANUP_TOKEN   = 'a7f3c19d5e2b8046af11c3d97e5b2064';
const USER_PATTERN    = 'durability-proof-%@example.com';
const SUB_ADDRESS     = 'papyrus-proof@example.com';

$db = auth_db();

$st = $db->prepare('SELECT id, email FROM users WHERE email LIKE ?');
$st->execute([USER_PATTERN]);
$users = $st->fetchAll();

$st = $db->prepare('SELECT email FROM newsletter_subscribers WHERE email = ?');
$st->execute([SUB_ADDRESS]);
$subs = $st->fetchAll();

if (!hash_equals(CLEANUP_TOKEN, (string)($_GET['token'] ?? ''))) {
    json_out(true, ['mode' => 'dry-run',
                    'users' => array_column($users, 'email'),
                    'subscribers' => array_column($subs, 'email')]);
}

$deleted = ['users' => 0, 'user_progress' => 0, 'user_stats' => 0,
            'sessions' => 0, 'auth_tokens' => 0, 'newsletter_subscribers' => 0];
foreach ($users as $u) {
    foreach (['user_progress', 'user_stats', 'sessions', 'auth_tokens'] as $t) {
        $q = $db->prepare("DELETE FROM $t WHERE user_id = ?");
        $q->execute([$u['id']]);
        $deleted[$t] += $q->rowCount();
    }
    $q = $db->prepare('DELETE FROM users WHERE id = ?');
    $q->execute([$u['id']]);
    $deleted['users'] += $q->rowCount();
}
$q = $db->prepare('DELETE FROM newsletter_subscribers WHERE email = ?');
$q->execute([SUB_ADDRESS]);
$deleted['newsletter_subscribers'] += $q->rowCount();

$remaining = [];
foreach (['users', 'user_progress', 'sessions', 'newsletter_subscribers'] as $t) {
    $remaining[$t] = (int)$db->query("SELECT COUNT(*) AS n FROM $t")->fetch()['n'];
}
json_out(true, ['mode' => 'deleted', 'deleted' => $deleted, 'remaining' => $remaining]);
