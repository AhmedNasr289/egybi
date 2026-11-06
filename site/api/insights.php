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
// Environment first, exactly as hit.php does. The key used to live only in
// _private/analytics.key, which every deploy deleted — so it was regenerated on
// each push and whatever ?key= you had bookmarked stopped working. Setting
// ANALYTICS_KEY in hPanel makes it permanent.
$secret = '';
$libEarly = __DIR__ . '/../auth/lib.php';
if (is_file($libEarly)) { require_once $libEarly; $secret = analytics_key(); }
if (strlen($secret) < 16) $secret = (string)(getenv('ANALYTICS_KEY') ?: '');
if (strlen($secret) < 16) $secret = (string)@file_get_contents($dir . '/analytics.key');
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
    echo 'Forbidden. Append ?key=YOUR_KEY (the ANALYTICS_KEY env var, or api/_private/analytics.key).';
    exit;
}

function q(PDO $db, string $sql, array $p = []): array { $s = $db->prepare($sql); $s->execute($p); return $s->fetchAll(PDO::FETCH_ASSOC); }
$e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES); };

// Read from the shared durable database when one is configured — that is where
// hit.php now writes. The old SQLite file is only consulted as a fallback.
$db = null;
$lib = __DIR__ . '/../auth/lib.php';
if (is_file($lib)) { require_once $lib; $db = durable_db(); }
if (!$db) {
    try {
        $db = new PDO('sqlite:' . $dir . '/analytics.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    } catch (Throwable $ex) {
        echo 'No data yet.'; exit;
    }
}
try { $db->query('SELECT 1 FROM hits LIMIT 1'); }
catch (Throwable $ex) { echo 'No page-views recorded yet.'; exit; }

$since30 = gmdate('Y-m-d', time() - 29 * 86400);
$since7  = gmdate('Y-m-d', time() - 6 * 86400);
$today   = gmdate('Y-m-d');

$totViews    = (int)(q($db, 'SELECT COUNT(*) c FROM hits')[0]['c'] ?? 0);
$views30     = (int)(q($db, 'SELECT COUNT(*) c FROM hits WHERE day>=?', [$since30])[0]['c'] ?? 0);
$viewsToday  = (int)(q($db, 'SELECT COUNT(*) c FROM hits WHERE day=?', [$today])[0]['c'] ?? 0);
$uniq7       = (int)(q($db, 'SELECT COUNT(DISTINCT visitor) c FROM hits WHERE day>=?', [$since7])[0]['c'] ?? 0);
$perDay      = q($db, 'SELECT day, COUNT(*) v, COUNT(DISTINCT visitor) u FROM hits WHERE day>=? GROUP BY day ORDER BY day', [$since30]);
// Fold '/index.html' into '/' at read time as well as at write time. hit.php
// normalises new rows, but rows written before that existed still carry the
// long form, and leaving them split makes the homepage look like two separate
// pages. CASE/IN is portable across MySQL and SQLite, so this works on either
// backing store.
$topPaths    = q($db, "SELECT CASE WHEN path IN ('/index.html','/index.htm') THEN '/' ELSE path END p,
                              COUNT(*) v
                       FROM hits WHERE day>=?
                       GROUP BY p ORDER BY v DESC LIMIT 15", [$since30]);
$topRefs     = q($db, "SELECT ref, COUNT(*) v FROM hits WHERE day>=? AND ref<>'' GROUP BY ref ORDER BY v DESC LIMIT 12", [$since30]);
$directShare = (int)(q($db, "SELECT COUNT(*) c FROM hits WHERE day>=? AND (ref IS NULL OR ref='')", [$since30])[0]['c'] ?? 0);

$maxDay = 1; foreach ($perDay as $r) { $maxDay = max($maxDay, (int)$r['v']); }

// --- funnel (only present once the event column exists) ---------------------
$hasEvents = false;
try {
    // PRAGMA table_info is SQLite-only. Storage moved to MySQL, where that
    // statement is a syntax error -- which the catch below swallowed, leaving
    // $hasEvents false and the funnel section silently absent from the page.
    // Not "no events recorded": the check itself could never succeed.
    // Ask the CONNECTION which engine it is, not the configuration: when MySQL
    // is configured but unreachable, durable_db() returns null and this page
    // falls back to the SQLite file, where SHOW COLUMNS fails, the catch hides
    // it, and the planner rows would read as dashes during the outage.
    $cols = [];
    if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
        foreach ($db->query('SHOW COLUMNS FROM hits') as $c) { $cols[] = $c['Field']; }
    } else {
        foreach ($db->query('PRAGMA table_info(hits)') as $c) { $cols[] = $c['name']; }
    }
    if (in_array('event', $cols, true)) {
        $hasEvents = true;
    }
} catch (Throwable $ex) { /* funnel is optional */ }

// --- the trip companion: the number the pivot is judged on -------------------
// Until 2026-11-06 the funnel here counted the RETIRED SQL-practice product
// (hero query runs, challenge attempts, sign-ups) while the pivot's metric -
// planner uses per week, and how many of them go on to the paid plan check -
// was recorded by nothing and shown nowhere. The day-42 rule (>= 300 planner
// uses by 2026-11-20) could not be read.
//
// A "planner use" is a visit that ADDS A STOP (plan.js sends plan_stop_added
// once per page load). Those events exist only from PLAN_EVENTS_FROM; for the
// weeks before, the only honest signal is visits to plan.html, shown beside it.
//
// 'visitor' is a per-day hash (hit.php mixes in the date), so every count here
// is VISITOR-DAYS: one person on two days counts twice. The page says so.
const PIVOT_DAY0 = '2026-10-09';
const PLAN_EVENTS_FROM = '2026-11-06';
const DAY42 = '2026-11-20';
const DAY42_TARGET = 300;

// Labels say what was MEASURED: the last four are clicks (data-ev), so they
// count people who pressed the button, not prints, orders or confirmed
// sign-ups.
$pivotRows = [
    ['key' => 'planner_opened',   'label' => 'Opened the planner (plan.html)',              'path' => '/plan.html'],
    ['key' => 'plan_stop_added',  'label' => 'Added a stop: a planner use',                 'event' => 'plan_stop_added'],
    ['key' => 'plan_route_built', 'label' => 'Built a route (two or more stops)',           'event' => 'plan_route_built'],
    ['key' => 'plan_print',       'label' => 'Pressed "Print or save as PDF"',              'event' => 'plan_print'],
    ['key' => 'plan_to_ask',      'label' => 'Clicked through from the plan to the plan check', 'event' => 'plan_to_ask'],
    ['key' => 'ask_mail',         'label' => 'Opened the e-mail to order the plan check',  'event' => 'ask_mail'],
    ['key' => 'newsletter_submit','label' => 'Pressed subscribe for The Papyrus',          'event' => 'newsletter_submit'],
];

function pivot_count(PDO $db, array $row, string $from, string $to, bool $hasEvents): int {
    if (isset($row['event'])) {
        $r = q($db, 'SELECT COUNT(DISTINCT visitor) c FROM hits WHERE event=? AND day>=? AND day<=?',
               [$row['event'], $from, $to]);
    } elseif ($hasEvents) {
        // Page views only: an event row carries the path of the page it fired on.
        $r = q($db, "SELECT COUNT(DISTINCT visitor) c FROM hits WHERE event='' AND path=? AND day>=? AND day<=?",
               [$row['path'], $from, $to]);
    } else {
        // A store from before the event column: every row is a page view, and
        // naming the missing column would take the whole page down.
        $r = q($db, 'SELECT COUNT(DISTINCT visitor) c FROM hits WHERE path=? AND day>=? AND day<=?',
               [$row['path'], $from, $to]);
    }
    return (int)($r[0]['c'] ?? 0);
}

$weekFrom = gmdate('Y-m-d', time() - 6 * 86400);
$prevFrom = gmdate('Y-m-d', time() - 13 * 86400);
$prevTo   = gmdate('Y-m-d', time() - 7 * 86400);
$pivot = [];
foreach ($pivotRows as $row) {
    $isEvent = isset($row['event']);
    $pivot[] = $row + [
        'week'     => ($isEvent && !$hasEvents) ? null : pivot_count($db, $row, $weekFrom, $today, $hasEvents),
        'previous' => ($isEvent && !$hasEvents) ? null : pivot_count($db, $row, $prevFrom, $prevTo, $hasEvents),
        'since0'   => ($isEvent && !$hasEvents) ? null : pivot_count($db, $row, PIVOT_DAY0, $today, $hasEvents),
    ];
}
$plannerUses = $pivot[1]['since0'];          // plan_stop_added, from PLAN_EVENTS_FROM
$plannerOpens = $pivot[0]['since0'];         // plan.html visitor-days, from day 0

if (($_GET['format'] ?? '') === 'json') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'generated_utc'     => gmdate('c'),
        'unit'              => 'visitor-days (the visitor hash is per day)',
        'windows'           => ['week' => [$weekFrom, $today], 'previous' => [$prevFrom, $prevTo],
                                'since0' => [PIVOT_DAY0, $today]],
        'plan_events_from'  => PLAN_EVENTS_FROM,
        'day42'             => ['date' => DAY42, 'target_planner_uses' => DAY42_TARGET,
                                'planner_uses' => $plannerUses, 'planner_opens' => $plannerOpens],
        'rows'              => array_map(function ($r) {
            return ['key' => $r['key'], 'label' => $r['label'], 'week' => $r['week'],
                    'previous' => $r['previous'], 'since0' => $r['since0']];
        }, $pivot),
        'visitors_7d'       => $uniq7,
        'views_30d'         => $views30,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}
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

<h2>The trip companion · the pivot's metric</h2>
<div class="cards">
  <div class="card"><b><?=$plannerUses === null ? '—' : number_format($plannerUses)?></b><span>Planner uses since <?=$e(PLAN_EVENTS_FROM)?></span></div>
  <div class="card"><b><?=number_format((int)$plannerOpens)?></b><span>Planner opened since <?=$e(PIVOT_DAY0)?></span></div>
  <div class="card"><b><?=number_format(DAY42_TARGET)?></b><span>Day-42 target · <?=$e(DAY42)?></span></div>
</div>
<table><tr><th>Step</th><th class="n">Last 7 days</th><th class="n">7 days before</th><th class="n">Since <?=$e(PIVOT_DAY0)?></th></tr>
<?php $cell = function ($v) { return $v === null ? '—' : number_format((int)$v); }; ?>
<?php foreach ($pivot as $r): ?>
  <tr><td><?=$e($r['label'])?></td><td class="n"><?=$cell($r['week'])?></td><td class="n"><?=$cell($r['previous'])?></td><td class="n"><?=$cell($r['since0'])?></td></tr>
<?php endforeach; ?>
</table>
<p class="muted">Counts are visitor-days: the visitor hash changes every day, so one person on two days counts twice. "Added a stop" and "Built a route" are recorded from <?=$e(PLAN_EVENTS_FROM)?> only, so the day-42 reading on <?=$e(DAY42)?> covers two weeks of planner uses, not six; "Planner opened" is the longer, weaker signal. A dash means the event column does not exist yet. The same numbers as JSON: add <code>&amp;format=json</code> to this address.</p>

<h2>Top pages · 30d</h2>
<table><tr><th>Path</th><th class="n">Views</th></tr>
<?php foreach ($topPaths as $r): ?><tr><td><?=$e($r['p'])?></td><td class="n"><?=number_format((int)$r['v'])?></td></tr><?php endforeach; ?>
<?php if (!$topPaths): ?><tr><td colspan="2" class="muted">No data yet.</td></tr><?php endif; ?>
</table>

<h2>Where visitors come from · 30d</h2>
<table><tr><th>Referrer</th><th class="n">Views</th></tr>
<tr><td><em>Direct / none</em></td><td class="n"><?=number_format($directShare)?></td></tr>
<?php foreach ($topRefs as $r): ?><tr><td><?=$e($r['ref'])?></td><td class="n"><?=number_format((int)$r['v'])?></td></tr><?php endforeach; ?>
</table>

<p class="muted">Rough "visitors" = distinct daily one-way hashes (no cookies, no cross-day tracking). Bots and Do-Not-Track are excluded.</p>
</body></html>
