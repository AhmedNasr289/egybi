<?php
/**
 * TEMPORARY. Delete this file immediately after running it once.
 *
 * Removes the newsletter and community rows created by my own throttle
 * testing. Both targets are HARDCODED literals -- nothing is read from the
 * request -- so this cannot reach a real subscriber or a real submission, and
 * cannot be turned into an arbitrary-delete endpoint by a later edit.
 *
 * Reports before/after counts, and lists the surviving newsletter addresses
 * MASKED, so it is possible to confirm the real signups came through untouched
 * without dumping the list itself into a URL response.
 *
 * Gated on the analytics key with hash_equals; fails closed if unset.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/../auth/lib.php';

$key = (string)($_GET['key'] ?? '');
$ak  = analytics_key();
if (strlen($ak) < 16 || !hash_equals($ak, $key)) {
    http_response_code(404);
    echo json_encode(['ok' => false]);
    exit;
}

$db = durable_db();
if (!$db) { echo json_encode(['ok' => false, 'error' => 'no durable database']); exit; }

$count = function (string $sql) use ($db) {
    try { return (int)($db->query($sql)->fetch()['c'] ?? 0); }
    catch (Throwable $e) { return null; }
};

$before = [
    'newsletter_total'     => $count("SELECT COUNT(*) c FROM newsletter_subscribers"),
    'community_total'      => $count("SELECT COUNT(*) c FROM community_notes"),
];

// --- deletions: hardcoded literals only --------------------------------------
$d1 = $db->prepare("DELETE FROM newsletter_subscribers WHERE email = 'throttle-probe@example.com'");
$d1->execute();

$d2 = $db->prepare("DELETE FROM community_notes WHERE message = 'throttle verification probe' AND approved = 0");
$d2->execute();

$after = [
    'newsletter_total'     => $count("SELECT COUNT(*) c FROM newsletter_subscribers"),
    'community_total'      => $count("SELECT COUNT(*) c FROM community_notes"),
];

// Masked survivor list, so the real signups can be confirmed intact.
$survivors = [];
try {
    foreach ($db->query("SELECT email FROM newsletter_subscribers ORDER BY email") as $r) {
        $e = (string)$r['email'];
        $at = strpos($e, '@');
        $survivors[] = $at === false
            ? '***'
            : substr($e, 0, 2) . str_repeat('*', max(1, $at - 2)) . substr($e, $at);
    }
} catch (Throwable $e) { $survivors = ['(unreadable)']; }

echo json_encode([
    'ok'                       => true,
    'deleted_newsletter_rows'  => $d1->rowCount(),
    'deleted_community_rows'   => $d2->rowCount(),
    'before'                   => $before,
    'after'                    => $after,
    'surviving_subscribers'    => $survivors,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
