<?php
/**
 * EgyBI — TEMPORARY one-shot cleanup for the mail-flow test account.
 * *** DELETED IN THE VERY NEXT COMMIT. Not part of the application. ***
 *
 * Pattern is HARDCODED and never read from the request. example.com is
 * IANA-reserved, so no genuine signup can ever match it. Requires a token.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

const CLEANUP_TOKEN = 'b4d2e77a1c9f30586ea4bb27d1c0f893';
const PATTERN       = 'mailflow-%@example.com';

$db = auth_db();
$st = $db->prepare('SELECT id, email FROM users WHERE email LIKE ?');
$st->execute([PATTERN]);
$users = $st->fetchAll();

if (!hash_equals(CLEANUP_TOKEN, (string)($_GET['token'] ?? ''))) {
    json_out(true, ['mode' => 'dry-run', 'matched' => array_column($users, 'email')]);
}

$deleted = ['users' => 0, 'user_progress' => 0, 'user_stats' => 0, 'sessions' => 0, 'auth_tokens' => 0];
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
$remaining = [];
foreach (['users', 'user_progress', 'sessions', 'newsletter_subscribers'] as $t) {
    $remaining[$t] = (int)$db->query("SELECT COUNT(*) AS n FROM $t")->fetch()['n'];
}
json_out(true, ['mode' => 'deleted', 'deleted' => $deleted, 'remaining' => $remaining]);
