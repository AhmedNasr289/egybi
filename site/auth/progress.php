<?php
/**
 * EgyBI — Phase 2: per-account challenge progress (isolated, hardened).
 *   GET   -> { ok, solved: [challenge_id, ...] }  for the signed-in user
 *   POST  -> merge {solved:[...]} into the user's progress (union, never delete)
 * Requires a valid session; state-changing POST also requires the X-CSRF header.
 * Every query is scoped to the authenticated user_id — a user can only ever
 * read or write their own rows. Anonymous visitors get 401 and simply keep
 * using localStorage, so "try before you sign up" is unaffected.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

$session = current_session();
if (!$session) json_out(false, ['message' => 'Sign in to sync your progress.'], 401);
$userId = $session['user_id'];
$db = auth_db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $st = $db->prepare('SELECT challenge_id FROM user_progress WHERE user_id=?');
    $st->execute([$userId]);
    $ids = array_map(function ($r) { return $r['challenge_id']; }, $st->fetchAll());
    json_out(true, ['solved' => $ids, 'stats' => get_stats($userId)]);
}

if ($method === 'POST') {
    require_csrf($session);
    // gating: cross-device sync is a feature (free at launch, config-driven)
    $u = current_user();
    if (!$u || !feature_allowed($u['plan'], 'progress.sync')) {
        json_out(false, ['message' => 'Progress sync is not available on your plan.'], 403);
    }
    $b = body();
    $solved = $b['solved'] ?? [];
    if (!is_array($solved)) json_out(false, ['message' => 'Expected a solved[] array.'], 422);
    // Optional difficulty-weighted points: { challenge_id: points }. Defaults to 10.
    $pts = (isset($b['points']) && is_array($b['points'])) ? $b['points'] : [];

    // Portable "insert if new" (no MySQL/SQLite ON CONFLICT divergence): check then insert.
    $exists = $db->prepare('SELECT 1 FROM user_progress WHERE user_id=? AND challenge_id=?');
    $ins    = $db->prepare('INSERT INTO user_progress (user_id, challenge_id, points, solved_at) VALUES (?,?,?,?)');
    $count = 0;
    foreach (array_slice($solved, 0, 2000) as $cid) {          // cap payload
        $cid = substr(preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$cid), 0, 64);
        if ($cid === '') continue;
        $exists->execute([$userId, $cid]);
        if ($exists->fetch()) continue;                        // already solved — keep original points
        $p = isset($pts[$cid]) ? (int)$pts[$cid] : 10;
        if ($p < 0 || $p > 200) $p = 10;                       // clamp to sane range
        $ins->execute([$userId, $cid, $p, now()]);
        $count++;
    }
    $stats = recompute_stats($userId);                         // XP + streak + rank
    $st = $db->prepare('SELECT challenge_id FROM user_progress WHERE user_id=?');
    $st->execute([$userId]);
    $ids = array_map(function ($r) { return $r['challenge_id']; }, $st->fetchAll());
    json_out(true, ['merged' => $count, 'solved' => $ids, 'stats' => $stats]);
}

json_out(false, ['message' => 'Method not allowed.'], 405);
