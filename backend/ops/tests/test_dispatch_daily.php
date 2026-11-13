<?php
declare(strict_types=1);
/**
 * Tests for backend/ops/dispatch_daily.php, with a fake GitHub (no network).
 * Run: php backend/ops/tests/test_dispatch_daily.php   (exit 0 = all pass)
 */
require __DIR__ . '/../dispatch_daily.php';

$failures = 0;
function check(bool $cond, string $name): void
{
    global $failures;
    echo ($cond ? 'PASS  ' : 'FAIL  ') . $name . "\n";
    if (!$cond) $failures++;
}

/** A fake GitHub: $started maps workflow => runs today; records every call. */
function fake(array $started, int $getCode = 200, int $postCode = 204): array
{
    $log = new ArrayObject();
    $call = function (string $method, string $path, ?array $body) use ($started, $getCode, $postCode, $log): array {
        $log[] = [$method, $path, $body];
        if ($method === 'GET') {
            foreach ($started as $wf => $n) {
                if (strpos($path, "/workflows/$wf/runs") !== false) return [$getCode, $getCode === 200 ? ['total_count' => $n] : []];
            }
            return [404, []];
        }
        return [$postCode, []];
    };
    return [$call, $log];
}
function posts(ArrayObject $log): array
{
    return array_values(array_filter($log->getArrayCopy(), fn($c) => $c[0] === 'POST'));
}

$today = '2026-11-13';

// 1. Both already started today: start nothing.
[$call, $log] = fake(['refresh-prices.yml' => 1, 'refresh-fx.yml' => 2]);
$r = dispatch_daily($call, 'o/r', $today, false);
check(count(posts($log)) === 0, 'already started today: nothing is started');
check($r[0][2] && $r[1][2], 'already started today: reported ok');

// 2. Neither started: start both, on main, and ask about TODAY.
[$call, $log] = fake(['refresh-prices.yml' => 0, 'refresh-fx.yml' => 0]);
$r = dispatch_daily($call, 'o/r', $today, false);
$p = posts($log);
check(count($p) === 2, 'not started: both are started');
check(($p[0][2]['ref'] ?? null) === 'main', 'the dispatch targets main');
check(strpos($log[0][1], 'created=%3E%3D2026-11-13') !== false, "the runs query asks about today's date");
check(strpos($p[0][1], '/repos/o/r/actions/workflows/refresh-prices.yml/dispatches') === 0, 'the dispatch path names the workflow');

// 3. One started, one not: start only the missing one.
[$call, $log] = fake(['refresh-prices.yml' => 1, 'refresh-fx.yml' => 0]);
dispatch_daily($call, 'o/r', $today, false);
$p = posts($log);
check(count($p) === 1 && strpos($p[0][1], 'refresh-fx.yml') !== false, 'only the missing workflow is started');

// 4. Dry run: report, start nothing.
[$call, $log] = fake(['refresh-prices.yml' => 0, 'refresh-fx.yml' => 0]);
$r = dispatch_daily($call, 'o/r', $today, true);
check(count(posts($log)) === 0, 'dry run: nothing is started');
check(strpos($r[0][1], 'dry run') !== false, 'dry run: says so');

// 5. GitHub cannot be read: start nothing, report failure (never guess "not started").
[$call, $log] = fake(['refresh-prices.yml' => 0, 'refresh-fx.yml' => 0], 500);
$r = dispatch_daily($call, 'o/r', $today, false);
check(count(posts($log)) === 0, 'unreadable runs: nothing is started');
check(!$r[0][2] && !$r[1][2], 'unreadable runs: reported as a failure');

// 6. GitHub refuses the dispatch (bad token): reported as a failure.
[$call, $log] = fake(['refresh-prices.yml' => 0, 'refresh-fx.yml' => 0], 200, 403);
$r = dispatch_daily($call, 'o/r', $today, false);
check(!$r[0][2] && strpos($r[0][1], '403') !== false, 'refused dispatch: reported with its HTTP code');

echo $failures === 0 ? "\nall passed\n" : "\n$failures failed\n";
exit($failures === 0 ? 0 : 1);
