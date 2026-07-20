<?php
/**
 * EgyBI — community moderation panel.
 *
 * Community submissions moved from a JSONL file into MySQL, but the moderation
 * step did not move with them: the file comment still said "open the file and
 * set approved: true", and nothing in the codebase could set approved=1 or
 * delete a row. The feature was write-only -- strangers could submit and
 * nothing could ever be published or removed. This is that missing step.
 *
 * Security notes, in order of importance:
 *
 *  1. This page renders ATTACKER-CONTROLLED text. Every interpolated value goes
 *     through $e() (htmlspecialchars with ENT_QUOTES). A moderation panel that
 *     XSSes its own moderator is worse than having no panel, because the
 *     moderator is the one account that can publish.
 *  2. Gated on the analytics key with hash_equals, failing closed when the key
 *     is unset or too short -- the same contract as insights.php and mail-test.
 *  3. Ids ARE taken from the request (moderation is meaningless otherwise), but
 *     they only ever reach a prepared statement, and the table is a hardcoded
 *     literal. There is no path from input to a table or column name.
 *  4. State changes require POST, so a GET prefetch, a crawler, or a link in a
 *     chat client cannot approve or delete anything by merely resolving a URL.
 *  5. noindex + no-store, because the URL carries the key.
 */
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

require __DIR__ . '/../auth/lib.php';

$key = (string)($_GET['key'] ?? ($_POST['key'] ?? ''));
$ak  = analytics_key();
if (strlen($ak) < 16 || !hash_equals($ak, $key)) {
    http_response_code(404);
    exit('Not found');
}

$db = durable_db();
if (!$db) { exit('No durable database configured.'); }

$e = static fn($v): string => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');

// ---- actions (POST only) ----------------------------------------------------
$notice = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $id  = (string)($_POST['id'] ?? '');
    $act = (string)($_POST['act'] ?? '');
    // Ids are app-generated random hex; anything else is not one of ours.
    if ($id !== '' && ctype_xdigit($id)) {
        if ($act === 'approve') {
            $st = $db->prepare('UPDATE community_notes SET approved = 1 WHERE id = ?');
            $st->execute([$id]);
            $notice = $st->rowCount() ? 'Published.' : 'Nothing changed.';
        } elseif ($act === 'unapprove') {
            $st = $db->prepare('UPDATE community_notes SET approved = 0 WHERE id = ?');
            $st->execute([$id]);
            $notice = $st->rowCount() ? 'Hidden again.' : 'Nothing changed.';
        } elseif ($act === 'delete') {
            $st = $db->prepare('DELETE FROM community_notes WHERE id = ?');
            $st->execute([$id]);
            $notice = $st->rowCount() ? 'Deleted.' : 'Nothing changed.';
        }
    } else {
        $notice = 'Invalid id.';
    }
    // Redirect after POST so a refresh cannot repeat the action.
    header('Location: ?key=' . rawurlencode($key) . '&m=' . rawurlencode($notice));
    exit;
}
$notice = (string)($_GET['m'] ?? '');

$rows = [];
try {
    $rows = $db->query('SELECT id, name, message, created_at, approved
                        FROM community_notes ORDER BY approved ASC, created_at DESC
                        LIMIT 500')->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $ex) {
    error_log('[EgyBI moderate] ' . $ex);
}
$pending  = array_values(array_filter($rows, static fn($r) => (int)$r['approved'] === 0));
$approved = array_values(array_filter($rows, static fn($r) => (int)$r['approved'] === 1));

$form = static function (string $id, string $act, string $label, string $key, string $cls = '') use ($e): string {
    return '<form method="post" style="display:inline">'
         . '<input type="hidden" name="key" value="' . $e($key) . '">'
         . '<input type="hidden" name="id" value="' . $e($id) . '">'
         . '<input type="hidden" name="act" value="' . $e($act) . '">'
         . '<button class="' . $e($cls) . '">' . $e($label) . '</button></form>';
};
?><!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>EgyBI — Moderation</title>
<style>
:root{--ink:#14110c;--soft:#6b6153;--gold:#c9a227;--blue:#0e2a5e;--line:#e7e0d0;--bg:#faf7f0;--red:#a3282d}
*{box-sizing:border-box}
body{margin:0 auto;padding:24px;max-width:920px;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
h1{font-size:1.4rem;margin:0 0 2px}h1 span{color:var(--gold)}
.sub{color:var(--soft);margin:0 0 20px;font-size:.85rem}
h2{font-size:1rem;margin:26px 0 10px;color:var(--blue)}
.note{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:10px}
.meta{color:var(--soft);font-size:.78rem;margin-bottom:6px}
.msg{white-space:pre-wrap;word-break:break-word;margin-bottom:10px}
button{font:inherit;border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;margin-right:6px}
button.go{background:var(--gold);border-color:var(--gold);color:#14110c;font-weight:600}
button.del{color:var(--red);border-color:#e4c9ca}
.flash{background:#fff;border-left:3px solid var(--gold);padding:10px 14px;border-radius:8px;margin-bottom:16px}
.empty{color:var(--soft);font-size:.9rem}
</style></head><body>
<h1>EgyBI <span>Moderation</span></h1>
<p class="sub">Community submissions. Nothing is public until approved here.</p>
<?php if ($notice !== ''): ?><div class="flash"><?=$e($notice)?></div><?php endif; ?>

<h2>Pending — <?=count($pending)?></h2>
<?php if (!$pending): ?><p class="empty">Nothing waiting.</p><?php endif; ?>
<?php foreach ($pending as $r): ?>
  <div class="note">
    <div class="meta"><?=$e($r['name'] ?: 'Anonymous')?> · <?=$e($r['created_at'])?></div>
    <div class="msg"><?=$e($r['message'])?></div>
    <?=$form((string)$r['id'], 'approve', 'Publish', $key, 'go')?>
    <?=$form((string)$r['id'], 'delete', 'Delete', $key, 'del')?>
  </div>
<?php endforeach; ?>

<h2>Published — <?=count($approved)?></h2>
<?php if (!$approved): ?><p class="empty">Nothing published yet.</p><?php endif; ?>
<?php foreach ($approved as $r): ?>
  <div class="note">
    <div class="meta"><?=$e($r['name'] ?: 'Anonymous')?> · <?=$e($r['created_at'])?></div>
    <div class="msg"><?=$e($r['message'])?></div>
    <?=$form((string)$r['id'], 'unapprove', 'Hide', $key)?>
    <?=$form((string)$r['id'], 'delete', 'Delete', $key, 'del')?>
  </div>
<?php endforeach; ?>
</body></html>
