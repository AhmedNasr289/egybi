<?php
/**
 * Session-handling regression tests.
 *
 * Sessions are keyed on sha256 of the cookie, so a mistake here either locks
 * every user out or silently accepts a value it should not. Run this before
 * touching create_session / current_session / destroy_session.
 *
 * Needs pdo_sqlite, which is not enabled in the default Windows php.ini:
 *   php -d extension_dir=C:/php/ext -d extension=php_sqlite3.dll  *       -d extension=php_pdo_sqlite.dll backend/test/session_test.php <tmp.sqlite>
 */
putenv('AUTH_SQLITE_PATH=' . $argv[1]);
putenv('AUTH_SECURE_COOKIE=0');
putenv('APP_SECRET=test-secret');
$_SERVER['HTTP_USER_AGENT'] = 'TestBrowser/1.0';
require __DIR__ . '/../../site/auth/lib.php';

$pass = 0; $fail = 0;
function ok($cond, $label) { global $pass,$fail; if ($cond) { $pass++; echo "  PASS  $label\n"; } else { $fail++; echo "  FAIL  $label\n"; } }

$db = auth_db();
$db->exec("INSERT INTO users (id,email,pass_hash,email_verified,plan,display_name,created_at,updated_at) VALUES ('u1','a@b.c','x',1,'free','S',datetime('now'),datetime('now'))");

// 1. create + round-trip
$s = create_session('u1');
$raw = $s['id'];
ok(strlen($raw) === 64 && ctype_xdigit($raw), 'cookie value is 64 hex chars');

$row = $db->query("SELECT id FROM sessions")->fetch();
ok($row['id'] !== $raw, 'DB does NOT store the raw cookie value');
ok($row['id'] === hash('sha256',$raw), 'DB stores sha256 of the cookie');

// 2. lookup by raw cookie works
$_COOKIE['egybi_sess'] = $raw;
ok(current_session() !== null, 'current_session() resolves a valid cookie');

// 3. a wrong cookie fails
$_COOKIE['egybi_sess'] = str_repeat('a',64);
ok(current_session() === null, 'unknown cookie rejected');

// 4. the STORED key must not work as a cookie (the whole point of hashing)
$_COOKIE['egybi_sess'] = $row['id'];
ok(current_session() === null, 'stolen DB key is NOT replayable as a cookie');

// 5. UA binding
$_COOKIE['egybi_sess'] = $raw;
$_SERVER['HTTP_USER_AGENT'] = 'DifferentBrowser/9';
ok(current_session() === null, 'UA mismatch destroys the session');
ok((int)$db->query("SELECT COUNT(*) c FROM sessions")->fetch()['c'] === 0, 'session row deleted on UA mismatch');

// 6. logout path uses the stored key
$_SERVER['HTTP_USER_AGENT'] = 'TestBrowser/1.0';
$s2 = create_session('u1'); $_COOKIE['egybi_sess'] = $s2['id'];
$cur = current_session();
ok($cur !== null, 'second session created');
destroy_session_key($cur['id']);
ok((int)$db->query("SELECT COUNT(*) c FROM sessions")->fetch()['c'] === 0, 'destroy_session_key() (logout path) deletes the row');

// 7. destroy_session() with the RAW value also works
$s3 = create_session('u1'); destroy_session($s3['id']);
ok((int)$db->query("SELECT COUNT(*) c FROM sessions")->fetch()['c'] === 0, 'destroy_session() (raw) deletes the row');

// 8. idle expiry honoured
$s4 = create_session('u1'); $_COOKIE['egybi_sess'] = $s4['id'];
$db->prepare("UPDATE sessions SET expires_at=?")->execute([gmdate('c', time()-10)]);
ok(current_session() === null, 'expired session rejected');

// 9. absolute cap honoured even with a future idle expiry
$s5 = create_session('u1'); $_COOKIE['egybi_sess'] = $s5['id'];
$db->prepare("UPDATE sessions SET created_at=?, expires_at=?")
   ->execute([gmdate('c', time()-40*86400), gmdate('c', time()+86400)]);
ok(current_session() === null, 'absolute lifetime cap enforced');

// 10. token pruning
$db->prepare("INSERT INTO auth_tokens (token,user_id,kind,expires_at,used,created_at) VALUES ('t1','u1','reset',?,1,?)")
   ->execute([gmdate('c', time()+3600), now()]);
prune_expired();
ok((int)$db->query("SELECT COUNT(*) c FROM auth_tokens")->fetch()['c'] === 0, 'used tokens pruned');

echo "\n  $pass passed, $fail failed\n";
exit($fail > 0 ? 1 : 0);
