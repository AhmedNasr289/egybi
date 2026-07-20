<?php
/**
 * TEMPORARY. Delete this file immediately after running it once.
 *
 * Removes the '/verify-probe' analytics row created while testing the hit.php
 * flood cap. It is test noise I introduced, not real traffic.
 *
 * Safety properties, deliberate:
 *  - The target is a HARDCODED literal. Nothing is read from the request, so
 *    this cannot be turned into an arbitrary-delete endpoint by an attacker or
 *    by a careless later edit.
 *  - Gated on the analytics key with hash_equals, and fails closed if the key
 *    is unset or too short.
 *  - It also REPORTS, without deleting, the other rows my testing created in
 *    the newsletter and community tables. Those were not asked for, and
 *    deletion is irreversible, so they are counted for a human to decide on
 *    rather than removed on assumption.
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
if (!$db) {
    echo json_encode(['ok' => false, 'error' => 'no durable database']);
    exit;
}

$out = [];

// --- the one deletion that was actually requested ---------------------------
$st = $db->prepare("DELETE FROM hits WHERE path = '/verify-probe'");
$st->execute();
$out['deleted_verify_probe_rows'] = $st->rowCount();

// --- report only; nothing below is deleted ----------------------------------
$count = function (string $sql) use ($db) {
    try { return (int)($db->query($sql)->fetch()['c'] ?? 0); }
    catch (Throwable $e) { return null; }
};
$out['still_present_for_you_to_decide'] = [
    'newsletter_throttle_probe' => $count("SELECT COUNT(*) c FROM newsletter_subscribers WHERE email = 'throttle-probe@example.com'"),
    'community_probe_rows'      => $count("SELECT COUNT(*) c FROM community_notes WHERE message = 'throttle verification probe'"),
    'newsletter_total'          => $count("SELECT COUNT(*) c FROM newsletter_subscribers"),
];

echo json_encode(['ok' => true] + $out);
