<?php
/**
 * EgyBI — private analytics dashboard (first-party, cookieless data).
 *
 * Access is gated by the per-install key in api/_private/analytics.key (the same
 * random secret hit.php generates on first page-view). View your stats at:
 *     https://egybi.com/api/insights.php?key=YOUR_KEY
 * Find YOUR_KEY once in File Manager: public_html/site/api/_private/analytics.key
 */
declare(strict_types=1);

$dir = __DIR__ . '/_private';
$keyFile = $dir . '/analytics.key';
$secret = @file_get_contents($keyFile);
$provided = (string)($_GET['key'] ?? '');

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

if (!is_string($secret) || strlen($secret) < 16) {
    http_response_code(404);
    echo 'No analytics yet — the key is created on the first page-view. Visit the site once, then reload.';
    exit;
}
if ($provided === '' || !hash_equals($secret, $provided)) {
    http_response_code(403);
    echo 'Forbidden. Append ?key=YOUR_KEY (found in api/_private/analytics.key).';
    exit;
}

function q(PDO $db, string $sql, array $p = []): array { $s = $db->prepare($sql); $s->execute($p); return $s->fetchAll(PDO::FETCH_ASSOC); }
$e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES); };

try {
    $db = new PDO('sqlite:' . $dir . '/analytics.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (Throwable $ex) {
    echo 'No data yet.'; exit;
}

$since30 = gmdate('Y-m-d', time() - 29 * 86400);
$since7  = gmdate('Y-m-d', time() - 6 * 86400);
$today   = gmdate('Y-m-d');

$totViews    = (int)(q($db, 'SELECT COUNT(*) c FROM hits')[0]['c'] ?? 0);
$views30     = (int)(q($db, 'SELECT COUNT(*) c FROM hits WHERE day>=?', [$since30])[0]['c'] ?? 0);
$viewsToday  = (int)(q($db, 'SELECT COUNT(*) c FROM hits WHERE day=?', [$today])[0]['c'] ?? 0);
$uniq7       = (int)(q($db, 'SELECT COUNT(DISTINCT visitor) c FROM hits WHERE day>=?', [$since7])[0]['c'] ?? 0);
$perDay      = q($db, 'SELECT day, COUNT(*) v, COUNT(DISTINCT visitor) u FROM hits WHERE day>=? GROUP BY day ORDER BY day', [$since30]);
$topPaths    = q($db, 'SELECT path, COUNT(*) v FROM hits WHERE day>=? GROUP BY path ORDER BY v DESC LIMIT 15', [$since30]);
$topRefs     = q($db, "SELECT ref, COUNT(*) v FROM hits WHERE day>=? AND ref<>'' GROUP BY ref ORDER BY v DESC LIMIT 12", [$since30]);
$directShare = (int)(q($db, "SELECT COUNT(*) c FROM hits WHERE day>=? AND (ref IS NULL OR ref='')", [$since30])[0]['c'] ?? 0);

$maxDay = 1; foreach ($perDay as $r) { $maxDay = max($maxDay, (int)$r['v']); }
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EgyBI — Insights</title><style>
:root{--ink:#14110c;--soft:#6b6153;--gold:#c9a227;--blue:#0e2a5e;--line:#e7e0d0;--bg:#faf7f0}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);padding:24px;max-width:920px;margin:0 auto}
h1{font-size:1.4rem;margin:0 0 2px}h1 span{color:var(--gold)}.sub{color:var(--soft);margin:0 0 22px;font-size:.85rem}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.card b{display:block;font-size:1.7rem;color:var(--blue);font-weight:800}.card span{color:var(--soft);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
h2{font-size:1rem;margin:26px 0 10px;color:var(--blue)}
.bars{display:flex;align-items:flex-end;gap:3px;height:120px;border-bottom:1px solid var(--line);padding-bottom:2px}
.bars .b{flex:1;background:linear-gradient(var(--gold),#e7c85a);border-radius:3px 3px 0 0;min-height:2px;position:relative}
.bars .b:hover::after{content:attr(data-t);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font-size:.7rem;padding:2px 6px;border-radius:5px;white-space:nowrap}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
td,th{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);font-size:.9rem}th{color:var(--soft);font-weight:600;font-size:.75rem;text-transform:uppercase}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}tr:last-child td{border-bottom:none}
.muted{color:var(--soft);font-size:.8rem;margin-top:26px}
</style></head><body>
<h1><span>EgyBI</span> Insights</h1>
<p class="sub">First-party · cookieless · last 30 days · <?=$e($today)?> (UTC)</p>

<div class="cards">
  <div class="card"><b><?=number_format($viewsToday)?></b><span>Views today</span></div>
  <div class="card"><b><?=number_format($views30)?></b><span>Views · 30d</span></div>
  <div class="card"><b><?=number_format($uniq7)?></b><span>Visitors · 7d</span></div>
  <div class="card"><b><?=number_format($totViews)?></b><span>Views · all time</span></div>
</div>

<h2>Views per day</h2>
<div class="bars">
<?php foreach ($perDay as $r): $hpx = (int)round((int)$r['v'] / $maxDay * 116); ?>
  <div class="b" style="height:<?=max(2,$hpx)?>px" data-t="<?=$e($r['day'])?>: <?=$e($r['v'])?> views / <?=$e($r['u'])?> visitors"></div>
<?php endforeach; if (!$perDay): ?><span class="muted">No views yet — share the site and refresh.</span><?php endif; ?>
</div>

<h2>Top pages · 30d</h2>
<table><tr><th>Path</th><th class="n">Views</th></tr>
<?php foreach ($topPaths as $r): ?><tr><td><?=$e($r['path'])?></td><td class="n"><?=number_format((int)$r['v'])?></td></tr><?php endforeach; ?>
<?php if (!$topPaths): ?><tr><td colspan="2" class="muted">No data yet.</td></tr><?php endif; ?>
</table>

<h2>Where visitors come from · 30d</h2>
<table><tr><th>Referrer</th><th class="n">Views</th></tr>
<tr><td><em>Direct / none</em></td><td class="n"><?=number_format($directShare)?></td></tr>
<?php foreach ($topRefs as $r): ?><tr><td><?=$e($r['ref'])?></td><td class="n"><?=number_format((int)$r['v'])?></td></tr><?php endforeach; ?>
</table>

<p class="muted">Rough "visitors" = distinct daily one-way hashes (no cookies, no cross-day tracking). Bots and Do-Not-Track are excluded.</p>
</body></html>
