<?php
/**
 * EgyBI — Phase 2 auth: shared library (PDO connection, sessions, CSRF,
 * rate-limiting, current-user). Isolated from the read-only KB API. Every DB
 * call is a prepared statement. Secrets come from env, never the repo.
 */
declare(strict_types=1);

// ---- config -----------------------------------------------------------------
/**
 * Find the config file, preferring one that SURVIVES A DEPLOYMENT.
 *
 * Hostinger's git deploy replaces public_html with the repository contents, so
 * anything inside it that is not in the repo — like a gitignored
 * `_private/config.php` — is deleted on every push. Shared hosting also has no
 * hPanel environment-variable section (only PHP version / extensions / options),
 * so env vars are not an option there either.
 *
 * What does survive is the area ABOVE public_html, which the deploy never
 * touches. So we walk upward from this file looking for `egybi-config.php`, and
 * use the first one found. Create it once in File Manager, one level above
 * public_html, and it outlives every future deploy.
 *
 * Search order:
 *   1. AUTH_CONFIG_PATH env var  — explicit override, if the host supports env
 *   2. egybi-config.php in any parent directory  — the durable path (recommended)
 *   3. _private/config.php beside this file      — local dev only; on Hostinger
 *                                                  this is erased on each push
 *   4. environment variables, then safe SQLite defaults
 */
/**
 * The root of the DEPLOYED tree — the folder Hostinger replaces on every push.
 *
 * This file lives at <deploy-root>/site/auth/lib.php, so two levels up is the
 * repository root as deployed (normally `public_html`). Anything at or below
 * that path is destroyed by a deploy; anything above it survives.
 *
 * DOCUMENT_ROOT is deliberately not used here: the root .htaccess rewrites into
 * `site/`, so the document root is often <deploy-root>/site — one level too deep.
 * A config sitting in <deploy-root> would then look "outside the web root" and be
 * called durable, when a deploy deletes it. That mistake happened.
 */
function deploy_root(): string
{
    return str_replace('\\', '/', dirname(dirname(__DIR__)));
}

/** True when $path sits inside the tree a deployment overwrites. */
function is_inside_deploy(string $path): bool
{
    $p = str_replace('\\', '/', (@realpath($path) ?: $path));
    $r = deploy_root();
    return $p === $r || strncmp($p, $r . '/', strlen($r) + 1) === 0;
}

function auth_config_file(): ?string
{
    static $found = false;
    if ($found !== false) return $found;

    $env = getenv('AUTH_CONFIG_PATH');
    if (is_string($env) && $env !== '' && @is_file($env)) return $found = $env;

    // Walk up collecting every candidate, then PREFER one that is outside the
    // deployed tree. Taking the first match would pick a config sitting in
    // public_html itself — which a deploy deletes — over the durable one above.
    $candidates = [];
    $dir = __DIR__;
    for ($i = 0; $i < 6; $i++) {
        $parent = dirname($dir);
        if ($parent === $dir) break;              // reached the filesystem root
        $dir = $parent;
        $p = $dir . '/egybi-config.php';
        if (@is_file($p)) $candidates[] = $p;     // @ — open_basedir may block the probe
    }
    foreach ($candidates as $p) if (!is_inside_deploy($p)) return $found = $p;   // durable
    if ($candidates) return $found = $candidates[0];                             // doomed, but usable

    $p = __DIR__ . '/_private/config.php';
    return $found = (@is_file($p) ? $p : null);
}

function auth_cfg(): array
{
    static $file = null;
    if ($file === null) {
        $p = auth_config_file();
        $file = $p ? (require $p) : [];
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
        // Google Sign-In. Empty client id = the whole Google path stays inert:
        // the button never renders and google.php refuses every request. Nothing
        // to disable, nothing half-wired — same config-gate pattern as payments.
        'google_client_id' => $get('google_client_id', 'GOOGLE_CLIENT_ID', ''),
        // The permanent ?key= for /api/insights.php. It used to live only in
        // api/_private/analytics.key, which every deploy deleted — so it was
        // regenerated on each push, silently invalidating the bookmarked URL and
        // resetting visitor de-duplication.
        'analytics_key' => $get('analytics_key', 'ANALYTICS_KEY', ''),
    ];
}

/** The analytics secret, from durable config first. Empty means "fall back to
 *  the generated file", which is ephemeral — see the note above. */
function analytics_key(): string { return trim((string)auth_cfg()['analytics_key']); }

/** Google Sign-In is available only when a client id is configured. */
function google_enabled(): bool { return trim((string)auth_cfg()['google_client_id']) !== ''; }

/** Stored in users.pass_hash for accounts that have never set a password.
 *  It is deliberately NOT a valid hash, so password_verify() can only ever
 *  return false against it — a Google-only account cannot be password-guessed.
 *  Using a sentinel rather than making the column nullable keeps the schema
 *  identical on MySQL and SQLite (SQLite cannot drop a NOT NULL in place). */
const PASS_NONE = 'google-only-no-password';

/** Additive migration: `google_sub` links a user to a Google account (the `sub`
 *  claim — Google's stable, immutable user id; the email can change, sub cannot).
 *  Runs at most once per process and is a no-op once the column exists, so it is
 *  safe on every request and needs no manual import step. */
function ensure_google_schema(PDO $db): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    try {
        $cols = [];
        if (auth_cfg()['driver'] === 'mysql') {
            foreach ($db->query('SHOW COLUMNS FROM users') as $c) $cols[] = $c['Field'];
        } else {
            foreach ($db->query('PRAGMA table_info(users)') as $c) $cols[] = $c['name'];
        }
        if (!in_array('google_sub', $cols, true)) {
            $db->exec('ALTER TABLE users ADD COLUMN google_sub TEXT');
            // Not UNIQUE at the column level (MySQL needs a length on TEXT keys);
            // a partial-style unique index works on both engines for non-null values.
            try { $db->exec('CREATE UNIQUE INDEX idx_users_google ON users (google_sub)'); } catch (Throwable $e) {}
        }
    } catch (Throwable $e) { /* never break a request on housekeeping */ }
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

/**
 * Is the store durable — i.e. does it survive a deployment?
 *
 * This exists because of a real incident. Hostinger's git deploy replaces
 * public_html with the repository contents, and `_private/` is gitignored, so
 * it is not in the repository and every push DELETED it. auth_db() then quietly
 * rebuilt an empty SQLite file on the next request, so nothing ever errored —
 * accounts, XP, streaks and the newsletter list simply ceased to exist, over and
 * over, without a single log line. Silence was the bug.
 *
 * MySQL lives outside the deploy path, so it is durable by definition. SQLite is
 * durable only if its file sits OUTSIDE the document root.
 *
 * Returns ['durable' => bool, 'why' => string, 'driver' => string].
 */
function storage_durability(): array
{
    $c = auth_cfg();
    if ($c['driver'] === 'mysql') {
        return ['durable' => true, 'driver' => 'mysql',
                'why' => 'MySQL data lives outside public_html, so deployments cannot touch it.'];
    }
    $path = (string)$c['sqlite_path'];
    if (is_inside_deploy(dirname($path))) {
        return ['durable' => false, 'driver' => 'sqlite',
                'why' => 'SQLite file is inside the deployed folder (' . deploy_root() . '), '
                       . 'which every push replaces — so the database is destroyed each deploy. '
                       . 'Use MySQL, or move sqlite_path ABOVE that folder.'];
    }
    return ['durable' => true, 'driver' => 'sqlite',
            'why' => 'SQLite file is above the deployed folder, so deployments leave it alone.'];
}

/** Run a .sql file statement-by-statement. PDO::exec with a multi-statement
 *  string is unreliable across drivers, so split on statement boundaries.
 *
 *  Errors are RECORDED, not just swallowed. Swallowing them is how a failed
 *  CREATE TABLE for `users` went unnoticed while every other table succeeded —
 *  the endpoint just reported a null count and said nothing about why. */
/**
 * Split a .sql file into statements, honouring quotes and comments.
 *
 * A plain explode(';') is not good enough, and this is not hypothetical: the
 * `users` table failed to create on MariaDB with a syntax error because an
 * INLINE comment contained a semicolon —
 *
 *     google_sub VARCHAR(64) NULL,  -- Google's immutable user id; NULL for ...
 *
 * — so the CREATE was cut in half and both halves were invalid. Stripping only
 * full-line comments missed it. This walks the text tracking quote and comment
 * state, so a `;` inside a string, a `--` comment or a block comment never ends
 * a statement.
 */
function split_sql_statements(string $sql): array
{
    $out = []; $buf = '';
    $len = strlen($sql);
    $q = '';                 // current quote char: ' " or `
    $line = false; $block = false;
    for ($i = 0; $i < $len; $i++) {
        $c = $sql[$i]; $n = $i + 1 < $len ? $sql[$i + 1] : '';
        if ($line) { if ($c === "\n") { $line = false; $buf .= $c; } continue; }
        if ($block) { if ($c === '*' && $n === '/') { $block = false; $i++; } continue; }
        if ($q !== '') {
            $buf .= $c;
            if ($c === '\\' && $q !== '`') { $buf .= $n; $i++; continue; }   // escaped char
            if ($c === $q) $q = '';
            continue;
        }
        // MySQL needs whitespace after `--` for it to be a comment.
        if ($c === '-' && $n === '-' && ($i + 2 >= $len || ctype_space($sql[$i + 2]))) { $line = true; $i++; continue; }
        if ($c === '#') { $line = true; continue; }
        if ($c === '/' && $n === '*') { $block = true; $i++; continue; }
        if ($c === "'" || $c === '"' || $c === '`') { $q = $c; $buf .= $c; continue; }
        if ($c === ';') { $out[] = $buf; $buf = ''; continue; }
        $buf .= $c;
    }
    $out[] = $buf;
    return array_values(array_filter(array_map('trim', $out), fn($s) => $s !== ''));
}

function run_schema(PDO $pdo, string $file): array
{
    $errors = [];
    $sql = @file_get_contents($file);
    if (!is_string($sql) || $sql === '') return ['could not read ' . basename($file)];
    foreach (split_sql_statements($sql) as $stmt) {
        try {
            $pdo->exec($stmt);
        } catch (Throwable $e) {
            // "already exists" is expected and harmless; anything else is real.
            if (stripos($e->getMessage(), 'already exists') === false) {
                preg_match('/(?:CREATE TABLE IF NOT EXISTS|CREATE TABLE|ALTER TABLE)\s+`?(\w+)`?/i', $stmt, $m);
                $errors[] = ($m[1] ?? 'statement') . ': ' . substr($e->getMessage(), 0, 400);
                error_log('[EgyBI] schema error — ' . end($errors));
            }
        }
    }
    return $errors;
}

/** Last schema errors, for the health endpoint to surface. */
function schema_errors(?array $set = null): array
{
    static $errs = [];
    if ($set !== null) $errs = $set;
    return $errs;
}

function auth_db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = auth_cfg();

    // Shout once per request if the store is ephemeral. This is the log line
    // whose absence let the wipe-on-deploy bug hide for days.
    $d = storage_durability();
    if (!$d['durable']) {
        error_log('[EgyBI] EPHEMERAL AUTH STORAGE — data is destroyed on every deploy. ' . $d['why']);
    }

    if ($c['driver'] === 'mysql') {
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        // Self-initialise on first run, exactly like the SQLite path already did,
        // so going live needs no phpMyAdmin import — set the env vars and the
        // tables appear. Every statement is CREATE TABLE IF NOT EXISTS, so this
        // is a no-op on every subsequent request.
        $has = $pdo->query("SHOW TABLES LIKE 'users'")->fetchColumn();
        if (!$has) schema_errors(run_schema($pdo, __DIR__ . '/schema_auth_mysql.sql'));
    } else {
        $path = $c['sqlite_path'];
        if (!is_dir(dirname($path))) @mkdir(dirname($path), 0700, true);
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
        // Self-initialise on first run (SQLite launch mode): if the accounts
        // tables don't exist yet, apply the schema. Idempotent (CREATE TABLE IF
        // NOT EXISTS), so it runs once on a fresh DB and is a no-op thereafter —
        // no manual phpMyAdmin import needed to go live on SQLite.
        $has = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")->fetchColumn();
        if (!$has) {
            $schema = @file_get_contents(__DIR__ . '/schema_auth.sql');
            if (is_string($schema) && $schema !== '') $pdo->exec($schema);
        }
    }
    return $pdo;
}

// ---- newsletter subscribers ------------------------------------------------
/**
 * Store a Papyrus subscriber. This used to be an append-only JSONL file under
 * api/_private/, which every deploy deleted along with the rest of that folder —
 * real subscriber emails, gone silently on each push. Rows live outside the
 * deploy path, so they survive.
 *
 * Creates the table on demand so an already-initialised database picks it up
 * without a migration step. Returns 'added' | 'duplicate' | 'error'.
 */
function newsletter_add(string $email, string $ipHash = ''): string
{
    try {
        $db = auth_db();
        newsletter_ensure_schema($db);

        $st = $db->prepare('SELECT email FROM newsletter_subscribers WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) return 'duplicate';

        // Double opt-in: the row is stored UNCONFIRMED and inert until the person
        // clicks the link we email them. `token` is a per-address capability
        // secret used for both the confirm and the unsubscribe links.
        $db->prepare('INSERT INTO newsletter_subscribers (email, created_at, ip_hash, unsubscribed, confirmed, token) VALUES (?,?,?,0,0,?)')
           ->execute([$email, now(), $ipHash, rid(16)]);
        return 'added';
    } catch (Throwable $e) {
        error_log('[EgyBI] newsletter_add failed: ' . $e->getMessage());
        return 'error';
    }
}

// ---- The Papyrus: double opt-in, unsubscribe, and idempotent issue sending ---
// Three tables, all self-initialising like the accounts schema so going live
// needs no phpMyAdmin import:
//   newsletter_subscribers  — email + confirm/unsub state + a capability token
//   newsletter_issues       — one row per letter (draft → sending → sent)
//   newsletter_sends        — PK(issue_id,email); its existence IS the guard that
//                             a resend can never mail the same person twice.

/** Create/upgrade the newsletter tables. Idempotent; safe on old databases. */
function newsletter_ensure_schema(PDO $db): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    $my = auth_cfg()['driver'] === 'mysql';

    $db->exec($my
        ? "CREATE TABLE IF NOT EXISTS newsletter_subscribers (
             email VARCHAR(254) NOT NULL, created_at VARCHAR(32) NOT NULL,
             ip_hash VARCHAR(32) NULL, unsubscribed TINYINT NOT NULL DEFAULT 0,
             confirmed TINYINT NOT NULL DEFAULT 0, token VARCHAR(48) NULL,
             confirmed_at VARCHAR(32) NULL, unsubscribed_at VARCHAR(32) NULL,
             PRIMARY KEY (email(191))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        : "CREATE TABLE IF NOT EXISTS newsletter_subscribers (
             email TEXT PRIMARY KEY, created_at TEXT NOT NULL, ip_hash TEXT,
             unsubscribed INTEGER NOT NULL DEFAULT 0, confirmed INTEGER NOT NULL DEFAULT 0,
             token TEXT, confirmed_at TEXT, unsubscribed_at TEXT)");

    // Additive migration for a subscribers table created before double opt-in.
    try {
        $cols = [];
        if ($my) { foreach ($db->query('SHOW COLUMNS FROM newsletter_subscribers') as $c) $cols[] = $c['Field']; }
        else     { foreach ($db->query('PRAGMA table_info(newsletter_subscribers)') as $c) $cols[] = $c['name']; }
        $add = [
            'confirmed'       => $my ? 'TINYINT NOT NULL DEFAULT 0' : 'INTEGER NOT NULL DEFAULT 0',
            'token'           => $my ? 'VARCHAR(48) NULL'           : 'TEXT',
            'confirmed_at'    => $my ? 'VARCHAR(32) NULL'           : 'TEXT',
            'unsubscribed_at' => $my ? 'VARCHAR(32) NULL'           : 'TEXT',
        ];
        foreach ($add as $col => $type) {
            if (!in_array($col, $cols, true)) {
                try { $db->exec("ALTER TABLE newsletter_subscribers ADD COLUMN $col $type"); } catch (Throwable $e) {}
            }
        }
        // Grandfather anyone who signed up under the old single opt-in: they DID
        // opt in via the form, so mark them confirmed and give them an unsub token
        // rather than stranding them unable to receive or leave.
        $rows = $db->query("SELECT email FROM newsletter_subscribers WHERE token IS NULL OR token = ''")->fetchAll();
        if ($rows) {
            $upd = $db->prepare('UPDATE newsletter_subscribers SET token = ?, confirmed = 1, confirmed_at = COALESCE(confirmed_at, ?) WHERE email = ?');
            foreach ($rows as $r) $upd->execute([rid(16), now(), $r['email']]);
        }
    } catch (Throwable $e) { /* housekeeping never breaks a request */ }

    $db->exec($my
        ? "CREATE TABLE IF NOT EXISTS newsletter_issues (
             id VARCHAR(16) NOT NULL, slug VARCHAR(120) NOT NULL, subject VARCHAR(255) NOT NULL,
             html MEDIUMTEXT NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'draft',
             created_at VARCHAR(32) NOT NULL, sent_at VARCHAR(32) NULL,
             PRIMARY KEY (id), UNIQUE KEY uq_nl_slug (slug)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        : "CREATE TABLE IF NOT EXISTS newsletter_issues (
             id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, subject TEXT NOT NULL,
             html TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
             created_at TEXT NOT NULL, sent_at TEXT)");

    $db->exec($my
        ? "CREATE TABLE IF NOT EXISTS newsletter_sends (
             issue_id VARCHAR(16) NOT NULL, email VARCHAR(254) NOT NULL,
             status VARCHAR(16) NOT NULL DEFAULT 'sent', sent_at VARCHAR(32) NULL, error VARCHAR(255) NULL,
             PRIMARY KEY (issue_id, email(180))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        : "CREATE TABLE IF NOT EXISTS newsletter_sends (
             issue_id TEXT NOT NULL, email TEXT NOT NULL,
             status TEXT NOT NULL DEFAULT 'sent', sent_at TEXT, error TEXT,
             PRIMARY KEY (issue_id, email))");
}

function newsletter_confirm_url(string $email, string $token): string
{ return auth_cfg()['app_url'] . '/api/newsletter.php?action=confirm&e=' . rawurlencode($email) . '&t=' . rawurlencode($token); }

function newsletter_unsub_url(string $email, string $token): string
{ return auth_cfg()['app_url'] . '/api/unsubscribe.php?e=' . rawurlencode($email) . '&t=' . rawurlencode($token); }

/** The per-address capability token, or null if the email is unknown. */
function newsletter_token(string $email): ?string
{
    try {
        $db = auth_db(); newsletter_ensure_schema($db);
        $st = $db->prepare('SELECT token FROM newsletter_subscribers WHERE email = ?');
        $st->execute([strtolower($email)]);
        $t = $st->fetchColumn();
        return $t === false ? null : (string)$t;
    } catch (Throwable $e) { return null; }
}

/** Confirm a double-opt-in subscription. Returns 'confirmed' | 'already' | 'invalid'. */
function newsletter_confirm(string $email, string $token): string
{
    try {
        $db = auth_db(); newsletter_ensure_schema($db);
        $st = $db->prepare('SELECT confirmed, token FROM newsletter_subscribers WHERE email = ?');
        $st->execute([strtolower($email)]);
        $row = $st->fetch();
        if (!$row || $token === '' || !hash_equals((string)$row['token'], $token)) return 'invalid';
        if ((int)$row['confirmed'] === 1) return 'already';
        $db->prepare('UPDATE newsletter_subscribers SET confirmed = 1, confirmed_at = ?, unsubscribed = 0, unsubscribed_at = NULL WHERE email = ?')
           ->execute([now(), strtolower($email)]);
        return 'confirmed';
    } catch (Throwable $e) { error_log('[EgyBI] newsletter_confirm: ' . $e->getMessage()); return 'invalid'; }
}

/** One-click unsubscribe by capability token. Returns 'unsubscribed' | 'already' | 'invalid'. */
function newsletter_unsub(string $email, string $token): string
{
    try {
        $db = auth_db(); newsletter_ensure_schema($db);
        $st = $db->prepare('SELECT unsubscribed, token FROM newsletter_subscribers WHERE email = ?');
        $st->execute([strtolower($email)]);
        $row = $st->fetch();
        if (!$row || $token === '' || !hash_equals((string)$row['token'], $token)) return 'invalid';
        if ((int)$row['unsubscribed'] === 1) return 'already';
        $db->prepare('UPDATE newsletter_subscribers SET unsubscribed = 1, unsubscribed_at = ? WHERE email = ?')
           ->execute([now(), strtolower($email)]);
        return 'unsubscribed';
    } catch (Throwable $e) { error_log('[EgyBI] newsletter_unsub: ' . $e->getMessage()); return 'invalid'; }
}

/**
 * The Papyrus from the account page (2026-11-09).
 *
 * A signed-in reader whose email is VERIFIED can subscribe and unsubscribe
 * with one press. No confirmation email is sent: double opt-in exists to
 * prove the address belongs to the person asking, and verifying the account
 * already proved exactly that. An unverified account is refused (the caller
 * checks), so this can never subscribe an address nobody has proven.
 *
 * Returns 'subscribed' (confirmed, not unsubscribed), 'pending' (signed up on
 * the form, confirmation link not yet clicked) or 'none'.
 */
function newsletter_account_state(PDO $db, string $email): string
{
    newsletter_ensure_schema($db);
    $st = $db->prepare('SELECT confirmed, unsubscribed FROM newsletter_subscribers WHERE email = ?');
    $st->execute([strtolower($email)]);
    $r = $st->fetch();
    if (!$r || (int)$r['unsubscribed'] === 1) return 'none';
    return (int)$r['confirmed'] === 1 ? 'subscribed' : 'pending';
}

/** Subscribe (confirmed) or unsubscribe a verified account's own email. */
function newsletter_account_set(PDO $db, string $email, bool $on): string
{
    newsletter_ensure_schema($db);
    $email = strtolower($email);
    $st = $db->prepare('SELECT email FROM newsletter_subscribers WHERE email = ?');
    $st->execute([$email]);
    $exists = (bool)$st->fetch();
    if ($on) {
        if ($exists) {
            $db->prepare('UPDATE newsletter_subscribers SET unsubscribed = 0, unsubscribed_at = NULL, confirmed = 1,
                          confirmed_at = COALESCE(confirmed_at, ?) WHERE email = ?')->execute([now(), $email]);
        } else {
            // The same row shape the form writes, already confirmed, with its
            // own token so every issue carries a working unsubscribe link.
            $db->prepare('INSERT INTO newsletter_subscribers (email, created_at, ip_hash, unsubscribed, confirmed, token, confirmed_at)
                          VALUES (?,?,?,0,1,?,?)')->execute([$email, now(), 'account', rid(16), now()]);
        }
    } elseif ($exists) {
        $db->prepare('UPDATE newsletter_subscribers SET unsubscribed = 1, unsubscribed_at = ? WHERE email = ?')
           ->execute([now(), $email]);
    }
    return newsletter_account_state($db, $email);
}

/** Insert or refresh (while draft) a newsletter issue by slug. Returns the row or null. */
function newsletter_upsert_issue(string $slug, string $subject, string $html): ?array
{
    try {
        $db = auth_db(); newsletter_ensure_schema($db);
        $st = $db->prepare('SELECT * FROM newsletter_issues WHERE slug = ?');
        $st->execute([$slug]);
        $row = $st->fetch();
        if ($row) {
            if ($row['status'] === 'draft') {
                $db->prepare('UPDATE newsletter_issues SET subject = ?, html = ? WHERE id = ?')
                   ->execute([$subject, $html, $row['id']]);
                $row['subject'] = $subject; $row['html'] = $html;
            }
            return $row;
        }
        $id = rid(8);
        $db->prepare('INSERT INTO newsletter_issues (id, slug, subject, html, status, created_at) VALUES (?,?,?,?,\'draft\',?)')
           ->execute([$id, $slug, $subject, $html, now()]);
        return ['id'=>$id,'slug'=>$slug,'subject'=>$subject,'html'=>$html,'status'=>'draft','created_at'=>now(),'sent_at'=>null];
    } catch (Throwable $e) { error_log('[EgyBI] newsletter_upsert_issue: ' . $e->getMessage()); return null; }
}

/** Confirmed, not-unsubscribed subscribers NOT yet sent this issue (up to $limit). */
function newsletter_recipients_pending(string $issueId, int $limit): array
{
    $db = auth_db(); newsletter_ensure_schema($db);
    $limit = max(1, min(500, $limit));
    $sql = "SELECT s.email, s.token FROM newsletter_subscribers s
            WHERE s.confirmed = 1 AND s.unsubscribed = 0
              AND NOT EXISTS (SELECT 1 FROM newsletter_sends x WHERE x.issue_id = ? AND x.email = s.email)
            ORDER BY s.created_at LIMIT $limit";
    $st = $db->prepare($sql); $st->execute([$issueId]);
    return $st->fetchAll();
}

/** Record the outcome of a send. The PK(issue_id,email) makes a re-run idempotent. */
function newsletter_record_send(string $issueId, string $email, string $status, string $error = ''): void
{
    try {
        $db = auth_db();
        try {
            $db->prepare('INSERT INTO newsletter_sends (issue_id, email, status, sent_at, error) VALUES (?,?,?,?,?)')
               ->execute([$issueId, $email, $status, now(), substr($error, 0, 240)]);
        } catch (Throwable $dup) {
            $db->prepare('UPDATE newsletter_sends SET status = ?, sent_at = ?, error = ? WHERE issue_id = ? AND email = ?')
               ->execute([$status, now(), substr($error, 0, 240), $issueId, $email]);
        }
    } catch (Throwable $e) { error_log('[EgyBI] newsletter_record_send: ' . $e->getMessage()); }
}

/** Progress counts for an issue: confirmed audience, sent, failed, remaining. */
function newsletter_issue_stats(string $issueId): array
{
    $db = auth_db(); newsletter_ensure_schema($db);
    $confirmed = (int)$db->query('SELECT COUNT(*) FROM newsletter_subscribers WHERE confirmed = 1 AND unsubscribed = 0')->fetchColumn();
    $by = ['sent' => 0, 'failed' => 0];
    $st = $db->prepare('SELECT status, COUNT(*) c FROM newsletter_sends WHERE issue_id = ? GROUP BY status');
    $st->execute([$issueId]);
    foreach ($st as $r) $by[$r['status']] = (int)$r['c'];
    $done = array_sum($by);
    return ['confirmed' => $confirmed, 'sent' => $by['sent'], 'failed' => $by['failed'], 'remaining' => max(0, $confirmed - $done)];
}

function newsletter_mark_issue(string $issueId, string $status): void
{
    try {
        $db = auth_db();
        $db->prepare('UPDATE newsletter_issues SET status = ?, sent_at = CASE WHEN ? = \'sent\' THEN ? ELSE sent_at END WHERE id = ?')
           ->execute([$status, $status, now(), $issueId]);
    } catch (Throwable $e) { /* status is advisory */ }
}

/** Wrap an issue's body HTML in the branded shell + the required unsubscribe footer. */
function newsletter_wrap_issue(string $bodyHtml, string $unsubUrl): string
{
    $u = htmlspecialchars($unsubUrl, ENT_QUOTES);
    return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#292420">'
        . '<div style="background:#14110C;padding:20px 24px"><span style="color:#C9A227;font-weight:bold;font-size:20px">EgyBI</span>'
        . '<span style="color:#e9dfc8;font-size:13px"> &middot; The Papyrus</span></div>'
        . '<div style="border:1px solid #eee;border-top:none;padding:26px 24px;line-height:1.65;font-size:15px">' . $bodyHtml . '</div>'
        . '<div style="padding:16px 24px;color:#999;font-size:12px;text-align:center">'
        . 'You are receiving this because you confirmed a subscription to The Papyrus at egybi.com.<br>'
        . '<a href="' . $u . '" style="color:#7A5E10">Unsubscribe instantly</a></div></div>';
}

/** A tiny branded standalone HTML page for confirm/unsubscribe landings. */
function newsletter_notice_page(string $title, string $message): string
{
    $t = htmlspecialchars($title, ENT_QUOTES);
    $m = htmlspecialchars($message, ENT_QUOTES);
    $home = htmlspecialchars(auth_cfg()['app_url'], ENT_QUOTES);
    return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
        . "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        . "<meta name=\"robots\" content=\"noindex\"><title>$t &middot; EgyBI</title>"
        . "<style>body{margin:0;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;background:#14110C;color:#f3ead4;"
        . "display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}"
        . ".card{max-width:460px;background:#1b160e;border:1px solid #2c2416;border-radius:16px;padding:36px 34px;text-align:center}"
        . "h1{font-family:Cinzel,Georgia,serif;color:#E7C64C;font-size:1.5rem;margin:0 0 12px}"
        . "p{line-height:1.6;color:#e9dfc8;margin:0 0 22px}a{display:inline-block;background:#C9A227;color:#14110C;"
        . "text-decoration:none;font-weight:700;padding:11px 22px;border-radius:9px}</style></head>"
        . "<body><div class=\"card\"><h1>$t</h1><p>$m</p><a href=\"$home\">Back to EgyBI</a></div></body></html>";
}

/**
 * The shared durable store, for the write-side endpoints outside this module
 * (newsletter, community board, analytics). Returns null when no durable store
 * is configured, so each caller can fall back to its old file and say so.
 *
 * Everything that used to write into a `_private/` folder inside public_html was
 * losing its data on every deploy — subscribers, community submissions, and the
 * analytics database along with the key that unlocks it. One database fixes all
 * of them at once.
 */
function durable_db(): ?PDO
{
    try {
        if (!storage_durability()['durable']) return null;
        return auth_db();
    } catch (Throwable $e) {
        error_log('[EgyBI] durable_db unavailable: ' . $e->getMessage());
        return null;
    }
}

/** True when running on MySQL — the two engines differ on column types. */
function db_is_mysql(): bool { return auth_cfg()['driver'] === 'mysql'; }

// ---- small helpers ---------------------------------------------------------
function json_out(bool $ok, array $extra = [], int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    // These replies carry the signed-in user's email and their live CSRF token.
    // Without no-store an intermediary or the browser's bfcache may retain them.
    header('Cache-Control: no-store, private');
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

// ---- login timing ----------------------------------------------------------
/**
 * A hash that never matches, using the SAME algorithm hash_password() produces
 * on this host, so a failed login costs the same whether or not the account
 * exists.
 *
 * Measured on PHP 8.4: a bcrypt cost-12 verify is ~191ms and an argon2id verify
 * (m=65536,t=4,p=1) is ~259ms. The old code used a single hardcoded bcrypt
 * cost-12 dummy, so on any host where argon2id is available -- which
 * hash_password() prefers -- real accounts were ~68ms SLOWER than unknown ones.
 * That is a clean enumeration oracle, produced by the very constant written to
 * prevent one. Branching here keeps both paths on the same algorithm.
 *
 * These are precomputed rather than generated per request: password_verify()
 * reads the cost parameters out of the hash string, so a constant costs the
 * same as a freshly generated one and avoids paying for an extra hash.
 */
function dummy_hash(): string
{
    if (defined('PASSWORD_ARGON2ID')) {
        return '$argon2id$v=19$m=65536,t=4,p=1$cW5UUERtcmRHVXZlNHlSUQ$wABZPYOp8VlCYS7TFOWANqcJ0KMp2Og9A86ic2L5n48';
    }
    return '$2y$12$LFmjXcpX.S1YwQgQSwpcauoHRQVXpPVe6.mt2ob4X24cquB8L5OIe';
}

// ---- rate limiting (count recent attempts per ip+action) -------------------
function rate_ok(string $action, int $max, int $windowMin): bool
{
    return rate_ok_key(ip_hash(), $action, $max, $windowMin);
}

/**
 * Same limiter, but keyed on an arbitrary bucket instead of the caller's IP.
 *
 * Keying only on IP means a botnet, a rotating proxy pool, or simply an IPv6
 * /64 gets the full per-IP allowance against ONE account from each of billions
 * of addresses -- which is not a throttle at all. Callers pair the IP bucket
 * with a per-account bucket so credential stuffing is bounded by the target,
 * not by the source.
 */
function rate_ok_key(string $bucket, string $action, int $max, int $windowMin): bool
{
    $db = auth_db();
    $db->prepare('INSERT INTO auth_attempts (id, ip_hash, action, created_at) VALUES (?,?,?,?)')
       ->execute([rid(), $bucket, $action, now()]);
    $cut = gmdate('c', time() - $windowMin * 60);
    $st = $db->prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE ip_hash=? AND action=? AND created_at>=?');
    $st->execute([$bucket, $action, $cut]);
    // '<=' is correct despite the insert above happening first: the count
    // includes THIS attempt, so $max=10 allows ten and blocks the eleventh.
    // Verified by simulation and against the live endpoint.
    return ((int)($st->fetch()['n'] ?? 0)) <= $max;
}

/** Bucket key for per-account throttling. Hashed so raw emails never land in the table. */
function account_bucket(string $email): string
{
    return 'a:' . substr(hash('sha256', strtolower($email) . '|' . auth_cfg()['app_secret']), 0, 20);
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
    // 'secure' must match set_session_cookie(). A clearing cookie that omits it
    // is sent over plaintext and may not overwrite the secure original.
    setcookie(session_cookie_name(), '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'secure'   => auth_cfg()['secure_cookie'],
        'samesite' => 'Lax',
    ]);
}

/**
 * Session ids are stored HASHED, like passwords.
 *
 * The cookie carries the raw value; the row is keyed on sha256 of it. Storing
 * raw ids meant any read of the sessions table -- a backup, a dump, an SQLi
 * elsewhere in the app -- was instant, silent impersonation of every logged-in
 * user, with nothing to crack. Keyed on a digest, a leaked table is inert.
 *
 * sha256 hex is 64 chars, exactly the existing VARCHAR(64), so no schema
 * migration is required.
 */
function session_key(string $rawId): string { return hash('sha256', $rawId); }

/** Idle window; the absolute lifetime stays session_days, measured from created_at. */
function session_idle_days(): int { return max(1, min((int)auth_cfg()['session_days'], 7)); }

function create_session(string $userId): array
{
    $db = auth_db();
    prune_expired(); // opportunistic housekeeping (login is infrequent)
    $id = rid(32); $csrf = rid(32);
    // expires_at tracks the IDLE window now, not the absolute one, so a session
    // that is never used again dies in a week rather than lingering a month.
    $db->prepare('INSERT INTO sessions (id,user_id,csrf,ua_hash,expires_at,created_at) VALUES (?,?,?,?,?,?)')
       ->execute([session_key($id), $userId, $csrf, substr(hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 16), plus_days(session_idle_days()), now()]);
    set_session_cookie($id);
    return ['id' => $id, 'csrf' => $csrf];
}

function current_session(): ?array
{
    $raw = $_COOKIE[session_cookie_name()] ?? '';
    if ($raw === '' || !ctype_xdigit($raw)) return null;
    $key = session_key($raw);
    $st = auth_db()->prepare('SELECT * FROM sessions WHERE id=?');
    $st->execute([$key]);
    $s = $st->fetch();
    if (!$s) return null;

    if (strtotime($s['expires_at']) < time()) { destroy_session($raw); return null; }

    // Absolute cap from creation, so sliding the idle window cannot extend a
    // session indefinitely.
    $absolute = strtotime($s['created_at']) + (int)auth_cfg()['session_days'] * 86400;
    if (time() > $absolute) { destroy_session($raw); return null; }

    // Bind the session to the client that created it. ua_hash was written at
    // login and never compared, leaving the column decorative -- a stolen cookie
    // worked from any client. Trade-off worth stating: a browser that changes
    // its User-Agent mid-session (a version bump) gets logged out.
    $ua = substr(hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 16);
    if (!empty($s['ua_hash']) && !hash_equals((string)$s['ua_hash'], $ua)) {
        destroy_session($raw);
        return null;
    }

    // Slide the idle window, capped at the absolute lifetime. Written only when
    // it moves by more than an hour, so an active session does not cost a write
    // on every request.
    $target = min(time() + session_idle_days() * 86400, $absolute);
    if ($target - strtotime($s['expires_at']) > 3600) {
        try {
            auth_db()->prepare('UPDATE sessions SET expires_at=? WHERE id=?')
                     ->execute([gmdate('c', $target), $key]);
        } catch (Throwable $e) { /* refreshing is best-effort */ }
    }
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
        // auth_tokens was never pruned, so spent verify/reset/gnonce rows
        // accumulated forever. google.php?action=nonce alone mints up to 30 rows
        // per 15 min per IP from an unauthenticated GET -- unbounded growth on a
        // shared-hosting quota, and indefinite retention of used reset tokens.
        $db->prepare('DELETE FROM auth_tokens WHERE expires_at < ? OR used=1')
           ->execute([gmdate('c', time() - 86400)]);
    } catch (Throwable $e) { /* housekeeping must never break a request */ }
}

/**
 * Delete a session given the RAW cookie value (it is hashed here).
 *
 * Two names on purpose: rows now store sha256(id), so callers holding a cookie
 * and callers holding a fetched row are handling different values. A single
 * function taking "the id" would silently no-op for whichever caller passed the
 * wrong one, leaving a session alive that the code believed it had killed.
 */
function destroy_session(string $rawId): void
{
    destroy_session_key(session_key($rawId));
}

/** Delete a session given the STORED key, i.e. the `id` column of a fetched row. */
function destroy_session_key(string $key): void
{
    auth_db()->prepare('DELETE FROM sessions WHERE id=?')->execute([$key]);
}

function destroy_all_sessions(string $userId): void
{
    auth_db()->prepare('DELETE FROM sessions WHERE user_id=?')->execute([$userId]);
}

/** Require a valid session AND a matching CSRF header for state-changing writes. */
/**
 * Reject cross-site POSTs to endpoints that have no CSRF token yet.
 *
 * login and signup run before a session exists, so require_csrf() has nothing
 * to compare and they were reachable by a plain cross-origin form -- no
 * preflight, and SameSite=Lax does not block a top-level form POST. That let an
 * attacker silently log a victim into the ATTACKER's account, after which the
 * victim's solves and XP synced into it.
 *
 * Sec-Fetch-Site is the precise signal where available; Origin is the fallback.
 * When neither header is present the request is allowed: non-browser clients
 * (curl, health checks) send no Origin, and there is no CSRF risk without a
 * browser implicitly attaching credentials.
 */
function require_same_origin(): void
{
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($site !== '') {
        if ($site === 'same-origin' || $site === 'same-site' || $site === 'none') return;
        json_out(false, ['message' => 'Cross-site request blocked.'], 403);
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;
    $want = rtrim((string)auth_cfg()['app_url'], '/');
    if ($want !== '' && rtrim($origin, '/') !== $want) {
        json_out(false, ['message' => 'Cross-site request blocked.'], 403);
    }
}

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

// ---- account data: saved trips and places, export, deletion ----------------

/**
 * Tables for what a signed-in reader keeps: saved trips and saved places.
 * Created on first use, like the newsletter tables, because the schema files
 * only run when the users table is missing - an already-live database would
 * otherwise never get them. CREATE TABLE IF NOT EXISTS, so every later call
 * is a no-op.
 */
function account_ensure_schema(PDO $db): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    $my = auth_cfg()['driver'] === 'mysql';
    $db->exec($my
        ? "CREATE TABLE IF NOT EXISTS user_trips (
             id VARCHAR(32) NOT NULL, user_id VARCHAR(32) NOT NULL, title VARCHAR(120) NOT NULL,
             data_json MEDIUMTEXT NOT NULL, created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32) NOT NULL,
             PRIMARY KEY (id), KEY idx_trips_user (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        : "CREATE TABLE IF NOT EXISTS user_trips (
             id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
             data_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
    if (!$my) $db->exec('CREATE INDEX IF NOT EXISTS idx_trips_user ON user_trips(user_id)');
    $db->exec($my
        ? "CREATE TABLE IF NOT EXISTS user_saved_places (
             user_id VARCHAR(32) NOT NULL, place_key VARCHAR(80) NOT NULL, created_at VARCHAR(32) NOT NULL,
             PRIMARY KEY (user_id, place_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        : "CREATE TABLE IF NOT EXISTS user_saved_places (
             user_id TEXT NOT NULL, place_key TEXT NOT NULL, created_at TEXT NOT NULL,
             PRIMARY KEY (user_id, place_key))");
}

/** Run $fn inside one transaction: all of it lands, or none of it does. */
function with_tx(PDO $db, callable $fn)
{
    $db->beginTransaction();
    try {
        $out = $fn($db);
        $db->commit();
        return $out;
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/** Every table that holds rows belonging to one user, keyed on user_id. */
const ACCOUNT_TABLES = ['user_trips', 'user_saved_places', 'user_progress', 'user_stats', 'auth_tokens', 'sessions'];

/**
 * Delete a user and everything keyed to them, in one transaction, so a failure
 * part-way can never leave an account half-deleted. The users row goes last.
 * Newsletter subscriptions are keyed on the email address, not the account,
 * and have their own unsubscribe link, so they are left to that.
 */
function account_delete(PDO $db, string $userId): void
{
    account_ensure_schema($db);
    with_tx($db, function (PDO $db) use ($userId) {
        foreach (ACCOUNT_TABLES as $t) {
            $db->prepare("DELETE FROM $t WHERE user_id=?")->execute([$userId]);
        }
        $db->prepare('DELETE FROM users WHERE id=?')->execute([$userId]);
    });
}

/** Everything the account holds about its user, as one JSON-ready array. */
function account_export(PDO $db, array $u): array
{
    account_ensure_schema($db);
    $q = function (string $sql) use ($db, $u) {
        $st = $db->prepare($sql); $st->execute([$u['id']]); return $st->fetchAll();
    };
    $trips = array_map(function ($t) {
        return ['id' => $t['id'], 'title' => $t['title'], 'data' => json_decode($t['data_json'], true),
                'created_at' => $t['created_at'], 'updated_at' => $t['updated_at']];
    }, $q('SELECT * FROM user_trips WHERE user_id=? ORDER BY created_at'));
    return [
        'exported_at' => now(),
        'account' => ['email' => $u['email'], 'name' => $u['display_name'],
                      'verified' => (int)$u['email_verified'] === 1, 'created_at' => $u['created_at']],
        'trips' => $trips,
        'saved_places' => array_column($q('SELECT place_key FROM user_saved_places WHERE user_id=? ORDER BY created_at'), 'place_key'),
        'progress' => $q('SELECT challenge_id, solved_at FROM user_progress WHERE user_id=?'),
        // Keyed by email, not by account, so the list keeps it after an
        // account is deleted; the download still says what it holds.
        'newsletter' => newsletter_account_state($db, $u['email']),
    ];
}
