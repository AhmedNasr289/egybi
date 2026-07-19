<?php
/**
 * EgyBI — Phase 2: gamification stats + leaderboard (read-only).
 *   GET -> { ok, me: {xp, streak, rank, ...} (if signed in),
 *           leaderboard: [ {name, xp, rank}, ... top 10 ] }
 * The leaderboard exposes ONLY the public display_name (e.g. "Scribe-1A2B"),
 * never an email. XP/streak/rank come from the cached user_stats table.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

$db = auth_db();

// Top 10 by XP, joined to the public handle. Never selects email.
$rows = $db->query(
    'SELECT u.display_name AS name, s.xp AS xp
       FROM user_stats s JOIN users u ON u.id = s.user_id
      WHERE s.xp > 0
      ORDER BY s.xp DESC, s.updated_at ASC
      LIMIT 10'
)->fetchAll();

$board = [];
$place = 0;
foreach ($rows as $r) {
    $place++;
    $xp = (int)$r['xp'];
    $t = rank_tier($xp);
    $board[] = ['place' => $place, 'name' => $r['name'] ?: 'Scribe', 'xp' => $xp, 'rank' => $t['tier']];
}

$out = ['leaderboard' => $board];
$u = current_user();
if ($u) $out['me'] = get_stats($u['id']);

json_out(true, $out);
