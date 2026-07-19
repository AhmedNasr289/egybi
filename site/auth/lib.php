<?php
/**
 * EgyBI — Phase 2 auth: shared library (PDO connection, sessions, CSRF,
 * rate-limiting, current-user). Isolated from the read-only KB API. Every DB
 * call is a prepared statement. Secrets come from env, never the repo.
 */
declare(strict_types=1);

// ---- config -----------------------------------------------------------------
// Reads, in priority order: (1) backend/auth/_private/config.php (a gitignored
// file you fill in on Hostinger — the easy path, no hPanel env vars needed),
// (2) environment variables, (3) safe local-testing defaults (SQLite). Copy
// config.sample.php to _private/config.php and edit it to go live.
function auth_cfg(): array
{
    static $file = null;
    if ($file === null) {
        $p = __DIR__ . '/_private/config.php';
        $file = is_file($p) ? (require $p) : [];
        if (!is_array($file)) $file = [];
    }
    $get = function (string $key, string $env, $default) use ($file) {
        if (array_key_exists($key, $file) && $file[$key] !== '') return $file[$key];
        $e = getenv($env);
        return ($e !== false && $e !== '') ? $e : $default;
    };
    return [
        'driver'      => $get('driver', 'AUTH_DB_DRIVER', 'sqlite'),
        'host'        => $get('host', 'AUTH_DB_HOST', 'localhost'),
        'port'        => $get('port', 'AUTH_DB_PORT', '3306'),
        'name'        => $get('name', 'AUTH_DB_NAME', 'egybi_auth'),
        'user'        => $get('user', 'AUTH_DB_USER', 'egybi_user'),
        'pass'        => $get('pass', 'AUTH_DB_PASS', ''),
        'sqlite_path' => $get('sqlite_path', 'AUTH_SQLITE_PATH', __DIR__ . '/_private/auth.sqlite'),
        'app_secret'  => $get('app_secret', 'APP_SECRET', 'dev-only-insecure-secret-change-me'),
        'secure_cookie' => ((string)$get('secure_cookie', 'AUTH_SECURE_COOKIE', '1')) === '1',
        'session_days'  => (int)$get('session_days', 'AUTH_SESSION_DAYS', 30),
        'app_url'     => rtrim((string)$get('app_url', 'APP_URL', 'https://egybi.com'), '/'),
        // Require a verified email before login? Off by default (soft gate at
        // launch — users can sign in immediately; the UI shows "unverified").
        // Flip to '1' in config once email deliverability is proven.
        'require_verified' => ((string)$get('require_verified', 'AUTH_REQUIRE_VERIFIED', '0')) === '1',
        // SMTP (Hostinger): fill these to actually send verify/reset emails.
        'smtp_host'   => $get('smtp_host', 'SMTP_HOST', ''),
        'smtp_port'   => (int)$get('smtp_port', 'SMTP_PORT', 465),
        'smtp_user'   => $get('smtp_user', 'SMTP_USER', ''),
        'smtp_pass'   => $get('smtp_pass', 'SMTP_PASS', ''),
        'mail_from'   => $get('mail_from', 'MAIL_FROM', 'no-reply@egybi.com'),
        'mail_from_name' => $get('mail_from_name', 'MAIL_FROM_NAME', 'EgyBI'),
    ];
}

/** Argon2id where available (best), else bcrypt — so it works on every host. */
function hash_password(string $pw): string
{
    if (defined('PASSWORD_ARGON2ID')) {
        $h = @password_hash($pw, PASSWORD_ARGON2ID);
        if (is_string($h) && $h !== '') return $h;
    }
    return password_hash($pw, PASSWORD_DEFAULT); // bcrypt — universally available
}

function auth_db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = auth_cfg();
    if ($c['driver'] === 'mysql') {
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } else {
        $path = $c['sqlite_path'];
        if (!is_dir(dirname($path))) @mkdir(dirname($path), 0700, true);
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    }
    return $pdo;
}

// ---- small helpers ---------------------------------------------------------
function json_out(bool $ok, array $extra = [], int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(array_merge(['ok' => $ok], $extra));
    exit;
}

function rid(int $bytes = 8): string { return bin2hex(random_bytes($bytes)); }
function now(): string { return gmdate('c'); }
function plus_days(int $d): string { return gmdate('c', time() + $d * 86400); }
function plus_mins(int $m): string { return gmdate('c', time() + $m * 60); }
function ip_hash(): string { return substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . auth_cfg()['app_secret']), 0, 24); }

function body(): array
{
    if (!empty($_POST)) return $_POST;
    $raw = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($raw) ? $raw : [];
}

// ---- rate limiting (count recent attempts per ip+action) -------------------
function rate_ok(string $action, int $max, int $windowMin): bool
{
    $db = auth_db();
    $db->prepare('INSERT INTO auth_attempts (id, ip_hash, action, created_at) VALUES (?,?,?,?)')
       ->execute([rid(), ip_hash(), $action, now()]);
    $cut = gmdate('c', time() - $windowMin * 60);
    $st = $db->prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE ip_hash=? AND action=? AND created_at>=?');
    $st->execute([ip_hash(), $action, $cut]);
    return ((int)($st->fetch()['n'] ?? 0)) <= $max;
}

// ---- sessions --------------------------------------------------------------
function session_cookie_name(): string { return 'egybi_sess'; }

function set_session_cookie(string $id): void
{
    $c = auth_cfg();
    setcookie(session_cookie_name(), $id, [
        'expires'  => time() + $c['session_days'] * 86400,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $c['secure_cookie'],
        'samesite' => 'Lax',
    ]);
}

function clear_session_cookie(): void
{
    setcookie(session_cookie_name(), '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
}

function create_session(string $userId): array
{
    $db = auth_db();
    prune_expired(); // opportunistic housekeeping (login is infrequent)
    $id = rid(32); $csrf = rid(32);
    $db->prepare('INSERT INTO sessions (id,user_id,csrf,ua_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)')
       ->execute([$id, $userId, $csrf, substr(hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 16), plus_days(auth_cfg()['session_days']), now()]);
    set_session_cookie($id);
    return ['id' => $id, 'csrf' => $csrf];
}

function current_session(): ?array
{
    $id = $_COOKIE[session_cookie_name()] ?? '';
    if ($id === '' || !ctype_xdigit($id)) return null;
    $st = auth_db()->prepare('SELECT * FROM sessions WHERE id=?');
    $st->execute([$id]);
    $s = $st->fetch();
    if (!$s) return null;
    if (strtotime($s['expires_at']) < time()) { destroy_session($id); return null; }
    return $s;
}

function current_user(): ?array
{
    $s = current_session();
    if (!$s) return null;
    $st = auth_db()->prepare('SELECT id,email,email_verified,plan,display_name,created_at FROM users WHERE id=?');
    $st->execute([$s['user_id']]);
    return $st->fetch() ?: null;
}

/** A public leaderboard handle: 3–32 chars of letters/digits/space/_/- (trimmed).
 *  Length is counted in Unicode code points WITHOUT mbstring (not guaranteed on
 *  every shared host) — preg_match_all('/./us') counts code points portably. */
function valid_display_name(string $name): bool
{
    $name = trim($name);
    if ($name === '' || !preg_match('/^[\p{L}\p{N} _-]+$/u', $name)) return false;
    $len = preg_match_all('/./us', $name);
    return $len >= 3 && $len <= 32;
}

/** Housekeeping: drop expired sessions and stale rate-limit rows so those
 *  tables don't grow without bound. Called opportunistically on login (a
 *  low-frequency event), so no cron is required — though DEPLOY.md notes one. */
function prune_expired(): void
{
    $db = auth_db();
    try {
        $db->prepare('DELETE FROM sessions WHERE expires_at < ?')->execute([now()]);
        // Rate-limit rows older than a day are useless (widest window is 60 min).
        $db->prepare('DELETE FROM auth_attempts WHERE created_at < ?')->execute([gmdate('c', time() - 86400)]);
    } catch (Throwable $e) { /* housekeeping must never break a request */ }
}

function destroy_session(string $id): void
{
    auth_db()->prepare('DELETE FROM sessions WHERE id=?')->execute([$id]);
}

function destroy_all_sessions(string $userId): void
{
    auth_db()->prepare('DELETE FROM sessions WHERE user_id=?')->execute([$userId]);
}

/** Require a valid session AND a matching CSRF header for state-changing writes. */
function require_csrf(array $session): void
{
    $hdr = $_SERVER['HTTP_X_CSRF'] ?? ($_POST['csrf'] ?? '');
    if (!is_string($hdr) || !hash_equals($session['csrf'], $hdr)) {
        json_out(false, ['message' => 'Invalid or missing CSRF token.'], 403);
    }
}

/** Feature gating from the entitlements table. Everything is 'free' at launch. */
function feature_allowed(string $plan, string $feature): bool
{
    $st = auth_db()->prepare('SELECT allowed FROM entitlements WHERE plan=? AND feature=?');
    $st->execute([$plan, $feature]);
    $r = $st->fetch();
    return $r ? ((int)$r['allowed'] === 1) : false;
}

// ---- gamification: XP, streaks, rank --------------------------------------
/** The themed scribe-rank ladder. Returns the current tier and the next one. */
function rank_tier(int $xp): array
{
    $tiers = [
        [0,    'Apprentice Scribe'],
        [100,  'Scribe'],
        [300,  'Cord-Stretcher'],
        [700,  'Master Scribe'],
        [1500, 'Keeper of the House of Life'],
        [3000, 'Vizier of Data'],
    ];
    $cur = $tiers[0]; $next = null;
    foreach ($tiers as $i => $t) {
        if ($xp >= $t[0]) { $cur = $t; $next = $tiers[$i + 1] ?? null; }
    }
    $span = $next ? ($next[0] - $cur[0]) : 1;
    $prog = $next ? max(0, min(100, (int)round(($xp - $cur[0]) * 100 / max(1, $span)))) : 100;
    return ['tier' => $cur[1], 'tier_at' => $cur[0], 'next' => $next ? $next[1] : null,
            'next_at' => $next ? $next[0] : null, 'progress_pct' => $prog];
}

/** Read cached stats (no side effects) + derived rank. */
function get_stats(string $userId): array
{
    $st = auth_db()->prepare('SELECT xp,solved_count,current_streak,longest_streak,last_active_day FROM user_stats WHERE user_id=?');
    $st->execute([$userId]);
    $s = $st->fetch() ?: ['xp' => 0, 'solved_count' => 0, 'current_streak' => 0, 'longest_streak' => 0, 'last_active_day' => null];
    $xp = (int)$s['xp'];
    return [
        'xp' => $xp,
        'solved_count' => (int)$s['solved_count'],
        'current_streak' => (int)$s['current_streak'],
        'longest_streak' => (int)$s['longest_streak'],
        'rank' => rank_tier($xp),
    ];
}

/** Recompute XP + solved count from user_progress, and advance the daily streak
 *  (called on a solve/merge = genuine activity). Portable upsert (no MySQL/SQLite
 *  ON CONFLICT divergence). Returns the fresh stats. */
function recompute_stats(string $userId): array
{
    $db = auth_db();
    $agg = $db->prepare('SELECT COALESCE(SUM(points),0) AS xp, COUNT(*) AS n FROM user_progress WHERE user_id=?');
    $agg->execute([$userId]);
    $row = $agg->fetch();
    $xp = (int)$row['xp']; $n = (int)$row['n'];

    $today = gmdate('Y-m-d');
    $yest  = gmdate('Y-m-d', time() - 86400);
    $cs = $db->prepare('SELECT current_streak,longest_streak,last_active_day FROM user_stats WHERE user_id=?');
    $cs->execute([$userId]);
    $s = $cs->fetch();
    $cur = $s ? (int)$s['current_streak'] : 0;
    $long = $s ? (int)$s['longest_streak'] : 0;
    $last = $s['last_active_day'] ?? null;
    if ($last !== $today) {                 // first activity today advances the streak
        $cur = ($last === $yest) ? $cur + 1 : 1;
        $long = max($long, $cur);
        $last = $today;
    }
    if ($s) {
        $db->prepare('UPDATE user_stats SET xp=?,solved_count=?,current_streak=?,longest_streak=?,last_active_day=?,updated_at=? WHERE user_id=?')
           ->execute([$xp, $n, $cur, $long, $last, now(), $userId]);
    } else {
        $db->prepare('INSERT INTO user_stats (user_id,xp,solved_count,current_streak,longest_streak,last_active_day,updated_at) VALUES (?,?,?,?,?,?,?)')
           ->execute([$userId, $xp, $n, $cur, $long, $last, now()]);
    }
    return get_stats($userId);
}
