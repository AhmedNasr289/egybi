-- ============================================================================
-- EgyBI — Phase 2 auth / accounts schema.
-- Portable across MySQL (Hostinger, production) and SQLite (local testing):
-- every primary key is an app-generated random-hex string, so there is no
-- AUTO_INCREMENT / AUTOINCREMENT divergence. All access is via PDO prepared
-- statements. Lives in its own module (backend/auth/), separate from the
-- read-only knowledge-base API. On MySQL, add ENGINE=InnoDB DEFAULT CHARSET=
-- utf8mb4 to each table (harmless to omit on SQLite; the importer can append).
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,          -- bin2hex(random_bytes(8))
  email          TEXT NOT NULL,             -- stored lower-cased; unique below
  pass_hash      TEXT NOT NULL,             -- password_hash(..., PASSWORD_ARGON2ID)
  email_verified INTEGER NOT NULL DEFAULT 0,
  plan           TEXT NOT NULL DEFAULT 'free',
  display_name   TEXT,                      -- public handle for the leaderboard (never the email)
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Single-use, time-limited tokens for email verification and password reset.
CREATE TABLE IF NOT EXISTS auth_tokens (
  token      TEXT PRIMARY KEY,              -- 32 random bytes, hex
  user_id    TEXT NOT NULL,
  kind       TEXT NOT NULL,                 -- 'verify' | 'reset'
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id);

-- Server-side sessions. The session id is the secret carried in an HttpOnly
-- cookie; `csrf` is the double-submit token required on state-changing writes.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,              -- 32 random bytes, hex = cookie value
  user_id    TEXT NOT NULL,
  csrf       TEXT NOT NULL,
  ua_hash    TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- One row per solved challenge. `points` is the XP awarded for that solve
-- (difficulty-weighted, supplied by the client from the catalogue: Easy 10,
-- Medium 20, Hard 40; defaults to 10 when not provided).
CREATE TABLE IF NOT EXISTS user_progress (
  user_id      TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  points       INTEGER NOT NULL DEFAULT 10,
  solved_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, challenge_id)
);

-- Cached per-user gamification stats, recomputed on each progress merge. XP is
-- the sum of user_progress.points; the streak counts consecutive active UTC days.
CREATE TABLE IF NOT EXISTS user_stats (
  user_id         TEXT PRIMARY KEY,
  xp              INTEGER NOT NULL DEFAULT 0,
  solved_count    INTEGER NOT NULL DEFAULT 0,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_active_day TEXT,                       -- 'YYYY-MM-DD' (UTC)
  updated_at      TEXT NOT NULL
);

-- Feature gating as data, not code. Everything is 'free' at launch; a paid tier
-- is added by INSERTing rows for that plan — no code change.
CREATE TABLE IF NOT EXISTS entitlements (
  plan    TEXT NOT NULL,
  feature TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (plan, feature)
);
INSERT OR IGNORE INTO entitlements (plan, feature, allowed) VALUES
 ('free','challenges.all',1),
 ('free','progress.sync',1),
 ('free','solutions.view',1),
 ('free','daily.streaks',1),
 ('free','tracks.advanced',1),
 ('free','sandbox.python',1),
 ('free','teams',1);

-- Cheap rate-limiting: count recent rows per (ip_hash, action).
CREATE TABLE IF NOT EXISTS auth_attempts (
  id         TEXT PRIMARY KEY,
  ip_hash    TEXT NOT NULL,
  action     TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_ip ON auth_attempts(ip_hash, action, created_at);

-- The Papyrus subscriber list — see the MySQL schema for why this moved out of
-- api/_private/newsletter.jsonl (that folder is deleted by every deploy).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email        TEXT PRIMARY KEY,             -- stored lower-cased
  created_at   TEXT NOT NULL,
  ip_hash      TEXT,
  unsubscribed INTEGER NOT NULL DEFAULT 0
);
