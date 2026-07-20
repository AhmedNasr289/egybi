<?php
/** TEMPORARY — delete immediately after one run. Hardcoded literal target. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/../auth/lib.php';
$key = (string)($_GET['key'] ?? '');
$ak  = analytics_key();
if (strlen($ak) < 16 || !hash_equals($ak, $key)) { http_response_code(404); echo json_encode(['ok'=>false]); exit; }
$db = durable_db();
if (!$db) { echo json_encode(['ok'=>false,'error'=>'no durable database']); exit; }
$st = $db->prepare("DELETE FROM community_notes WHERE message = 'DURABILITY-TEST-DELETE-ME' AND approved = 0");
$st->execute();
$c = (int)($db->query("SELECT COUNT(*) c FROM community_notes")->fetch()['c'] ?? 0);
echo json_encode(['ok'=>true,'deleted'=>$st->rowCount(),'community_notes_remaining'=>$c]);
