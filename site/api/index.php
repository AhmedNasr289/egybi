<?php
/**
 * EgyBI Knowledge-Base API — front controller & router.
 *
 * A single entry point (Laravel-style) that all requests route through, so the
 * same code runs identically under Apache on Hostinger (via .htaccess rewrite)
 * and under PHP's built-in server for local testing. Framework-free on purpose:
 * no Composer/Laravel install is required to deploy on shared hosting.
 *
 * Controllers RETURN payload arrays; this file is the single place that emits
 * output and caches it, so caching actually works (no exit() inside controllers).
 *
 * Routes (an optional leading "/api" is accepted so it works whether deployed at
 * the domain root or under egybi.com/api/):
 *   GET /health
 *   GET /datasets                    list available dataset snapshots
 *   GET /datasets/{name}             one dataset snapshot (for the SQL sandbox)
 *   GET /charts/gdp | suez-revenue | tourism | gdp-composition | exports | highlights
 *   GET /charts/population | energy | governorates | prices | digital
 *   GET /charts/water-usage | sports-titles | industry
 *   GET /timeline
 *   GET /megaprojects
 */

$config = require __DIR__ . '/config.php';

require __DIR__ . '/lib/Database.php';
require __DIR__ . '/lib/Response.php';
require __DIR__ . '/lib/Cache.php';
require __DIR__ . '/controllers/DatasetController.php';
require __DIR__ . '/controllers/ChartController.php';

Response::cors($config);

// --- Resolve the route path (strip query string and an optional /api prefix) ---
$uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = trim($uri, '/');
$segments = $path === '' ? [] : explode('/', $path);
if (($segments[0] ?? '') === 'api') {
    array_shift($segments);
}
$route = implode('/', $segments);

// --- Serve from cache if warm (static reference data) ---
$cache    = new Cache($config['cache_dir'], $config['cache_ttl']);
$cacheKey = 'route_' . ($route === '' ? 'root' : $route);
if (($hit = $cache->get($cacheKey)) !== null) {
    Response::emit($hit, 200, 'HIT');
    exit;
}

// --- Dispatch ---
try {
    $payload = dispatch($route, $config);
} catch (ApiException $e) {
    Response::emit(['ok' => false, 'error' => $e->getMessage()], $e->statusCode, 'MISS');
    exit;
} catch (Throwable $e) {
    Response::emit(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()], 500, 'MISS');
    exit;
}

if ($payload === null) {
    Response::emit(['ok' => false, 'error' => "Not found: /{$route}"], 404, 'MISS');
    exit;
}

// Cache successful responses, then emit.
if (($payload['ok'] ?? false) === true) {
    $cache->set($cacheKey, $payload);
}
Response::emit($payload, 200, 'MISS');

// ---------------------------------------------------------------------------
function dispatch(string $route, array $config): ?array
{
    if ($route === 'datasets') {
        return DatasetController::list($config);
    }
    if (preg_match('#^datasets/([a-z_]+)$#', $route, $m)) {
        return DatasetController::snapshot($config, $m[1]);
    }

    switch ($route) {
        case '':
        case 'health':
            return Response::ok(['service' => 'EgyBI Knowledge-Base API', 'status' => 'up', 'driver' => $config['db_driver']]);
        case 'charts/gdp':             return ChartController::gdp($config);
        case 'charts/suez-revenue':    return ChartController::suezRevenue($config);
        case 'charts/tourism':         return ChartController::tourism($config);
        case 'charts/gdp-composition': return ChartController::gdpComposition($config);
        case 'charts/exports':         return ChartController::exports($config);
        case 'charts/highlights':      return ChartController::highlights($config);
        case 'charts/population':      return ChartController::population($config);
        case 'charts/energy':          return ChartController::energy($config);
        case 'charts/governorates':    return ChartController::governorates($config);
        case 'charts/prices':          return ChartController::prices($config);
        case 'charts/digital':         return ChartController::digital($config);
        case 'charts/water-usage':     return ChartController::waterUsage($config);
        case 'charts/sports-titles':   return ChartController::sportsTitles($config);
        case 'charts/industry':        return ChartController::industry($config);
        case 'charts/transport':       return ChartController::transport($config);
        case 'charts/universities':    return ChartController::universities($config);
        case 'charts/energy-trend':    return ChartController::energyTrend($config);
        case 'charts/telecom':         return ChartController::telecom($config);
        case 'charts/trade-partners':  return ChartController::tradePartners($config);
        case 'charts/social':          return ChartController::social($config);
        case 'charts/crops':           return ChartController::crops($config);
        case 'charts/health':          return ChartController::health($config);
        case 'charts/economy-depth':   return ChartController::economyDepth($config);
        case 'charts/climate':         return ChartController::climate($config);
        case 'charts/businessmen':     return ChartController::businessmen($config);
        case 'charts/arms-suppliers':  return ChartController::armsSuppliers($config);
        case 'timeline':               return ChartController::timeline($config);
        case 'megaprojects':           return ChartController::megaprojects($config);
    }

    return null; // -> 404
}
