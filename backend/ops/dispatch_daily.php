<?php
declare(strict_types=1);
/**
 * On-time trigger for the daily price and exchange-rate refreshes.
 *
 * WHY. GitHub's scheduler has been starting the 07:17 / 07:23 UTC refreshes
 * between 15:16 and 17:34 UTC (measured 2026-11-09..12), and the catch-up meant
 * to rescue a missed day (cron 16:17) at 22:17. Readers saw yesterday's prices
 * until late afternoon Cairo time. Hostinger's cron runs on time, so it starts
 * the refreshes instead, and the GitHub schedule stays as the backup.
 *
 * SAME RULE AS backend/ops/refresh_catchup.py: for each daily workflow, ask
 * whether it has STARTED today (UTC, any trigger) and start it only if not. So
 * the two triggers can never both run a day: whichever comes first wins.
 *
 * HOW TO RUN (hPanel > Advanced > Cron Jobs), e.g. daily at 07:20 UTC:
 *   php /home/uXXXXXXXXX/domains/egybi.com/public_html/backend/ops/dispatch_daily.php
 * Add  --dry-run  to see what it would do without starting anything.
 *
 * TOKEN. A fine-grained GitHub token, this repository only, permission
 * "Actions: Read and write" and nothing else. It is read from egybi-config.php
 * above public_html (key 'github_dispatch_token'), the same durable file the
 * site already uses, or from the GITHUB_DISPATCH_TOKEN environment variable.
 * It is never printed.
 *
 * SAFETY. CLI only: a web request is refused, and the root .htaccess already
 * returns 403 for everything under backend/.
 */

const DAILY_WORKFLOWS = ['refresh-prices.yml', 'refresh-fx.yml'];
const DISPATCH_REPO   = 'AhmedNasr289/egybi';

/**
 * Starts each daily workflow that has not started today.
 *
 * @param callable(string, string, ?array): array{0:int, 1:array} $call
 *        (method, path, json body or null) -> [HTTP status, decoded JSON body]
 * @return list<array{0:string, 1:string, 2:bool}> [workflow, what happened, ok]
 */
function dispatch_daily(callable $call, string $repo, string $today, bool $dryRun): array
{
    $out = [];
    foreach (DAILY_WORKFLOWS as $wf) {
        // created=>=YYYY-MM-DD, URL-encoded. total_count counts every trigger.
        [$code, $body] = $call('GET', "/repos/$repo/actions/workflows/$wf/runs?created=%3E%3D$today&per_page=1", null);
        if ($code !== 200 || !is_array($body) || !array_key_exists('total_count', $body)) {
            $out[] = [$wf, "ERROR: could not read today's runs (HTTP $code); nothing started", false];
            continue;
        }
        $n = (int)$body['total_count'];
        if (false) {
            $out[] = [$wf, "already started today ($n run" . ($n === 1 ? '' : 's') . ')', true];
            continue;
        }
        if ($dryRun) {
            $out[] = [$wf, 'not started today: would start it (dry run)', true];
            continue;
        }
        [$code] = $call('POST', "/repos/$repo/actions/workflows/$wf/dispatches", ['ref' => 'main']);
        $out[] = $code === 204
            ? [$wf, 'not started today: started it now', true]
            : [$wf, "ERROR: GitHub refused to start it (HTTP $code)", false];
    }
    return $out;
}

/** The token from egybi-config.php (found the way the site finds it), else the environment. */
function dispatch_token(): string
{
    $lib = dirname(__DIR__, 2) . '/site/auth/lib.php';
    if (is_file($lib)) {
        require_once $lib;
        $p = auth_config_file();
        if ($p !== null) {
            $cfg = require $p;
            if (is_array($cfg) && isset($cfg['github_dispatch_token']) && trim((string)$cfg['github_dispatch_token']) !== '') {
                return trim((string)$cfg['github_dispatch_token']);
            }
        }
    }
    $e = getenv('GITHUB_DISPATCH_TOKEN');
    return is_string($e) ? trim($e) : '';
}

/** Real HTTP to api.github.com with cURL. */
function github_caller(string $token): callable
{
    return function (string $method, string $path, ?array $body) use ($token): array {
        $ch = curl_init('https://api.github.com' . $path);
        $headers = [
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: egybi-dispatch-daily',
        ];
        $opts = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_TIMEOUT => 30];
        if ($body !== null) {
            $opts[CURLOPT_POSTFIELDS] = json_encode($body);
            $headers[] = 'Content-Type: application/json';
        }
        $opts[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $opts);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        $json = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        return [$code, is_array($json) ? $json : []];
    };
}

function dispatch_main(array $argv): int
{
    $dry = in_array('--dry-run', $argv, true);
    $today = gmdate('Y-m-d');
    $token = dispatch_token();
    if ($token === '') {
        fwrite(STDERR, "No github_dispatch_token in egybi-config.php (or GITHUB_DISPATCH_TOKEN). Nothing started.\n");
        return 2;
    }
    echo "Daily refresh trigger, $today (UTC)" . ($dry ? ', dry run' : '') . ":\n";
    $ok = true;
    foreach (dispatch_daily(github_caller($token), DISPATCH_REPO, $today, $dry) as [$wf, $what, $good]) {
        echo "  $wf: $what\n";
        $ok = $ok && $good;
    }
    return $ok ? 0 : 1;
}

// Run only from the command line, and only when this file is the entry point
// (so the test file can include it to call dispatch_daily()).
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    exit(dispatch_main($argv));
}
