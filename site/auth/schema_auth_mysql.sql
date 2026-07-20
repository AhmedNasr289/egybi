-- ============================================================================
-- EgyBI — Phase 2 auth / accounts schema — MYSQL (Hostinger production).
-- Import this one on Hostinger (phpMyAdmin). It differs from the SQLite test
-- schema (schema_auth.sql) in the ways MySQL requires:
--   * keys/indexed columns are VARCHAR(n), because MySQL cannot index a TEXT
--     column without a prefix length (SQLite allows TEXT keys; MySQL does not);
--   * tables are InnoDB / utf8mb4;
--   * the entitlements seed uses INSERT IGNORE (MySQL) not INSERT OR IGNORE.
-- Every primary key is an app-generated hex string, so no AUTO_INCREMENT.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id             VARCHAR(16) NOT NULL,       -- bin2hex(random_bytes(8)) = 16 chars
  email          VARCHAR(254) NOT NULL,      -- stored lower-cased
  pass_hash      VARCHAR(255) NOT NULL,      -- Argon2id or bcrypt hash (< 255)
  email_verified TINYINT NOT NULL DEFAULT 0,
  plan           VARCHAR(20) NOT NULL DEFAULT 'free',
  display_name   VARCHAR(64) NULL,           -- public leaderboard handle (never the email)
  google_sub     VARCHAR(64) NULL,           -- Google's immutable user id; NULL for password-only
  created_at     VARCHAR(32) NOT NULL,       -- ISO 8601 string (gmdate('c'))
  updated_at     VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google (google_sub)    -- NULLs are exempt from UNIQUE in MySQL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_tokens (
  token      VARCHAR(64) NOT NULL,           -- 32 random bytes hex = 64 chars
  user_id    VARCHAR(16) NOT NULL,
  kind       VARCHAR(10) NOT NULL,           -- 'verify' | 'reset'
  expires_at VARCHAR(32) NOT NULL,
  used       TINYINT NOT NULL DEFAULT 0,
  created_at VARCHAR(32) NOT NULL,
  PRIMARY KEY (token),
  KEY idx_tokens_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id         VARCHAR(64) NOT NULL,           -- 32 random bytes hex = the cookie value
  user_id    VARCHAR(16) NOT NULL,
  csrf       VARCHAR(64) NOT NULL,
  ua_hash    VARCHAR(32) NULL,
  expires_at VARCHAR(32) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_progress (
  user_id      VARCHAR(16) NOT NULL,
  challenge_id VARCHAR(64) NOT NULL,
  points       INT NOT NULL DEFAULT 10,
  solved_at    VARCHAR(32) NOT NULL,
  PRIMARY KEY (user_id, challenge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_stats (
  user_id         VARCHAR(16) NOT NULL,
  xp              INT NOT NULL DEFAULT 0,
  solved_count    INT NOT NULL DEFAULT 0,
  current_streak  INT NOT NULL DEFAULT 0,
  longest_streak  INT NOT NULL DEFAULT 0,
  last_active_day VARCHAR(10) NULL,          -- 'YYYY-MM-DD' (UTC)
  updated_at      VARCHAR(32) NOT NULL,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entitlements (
  plan    VARCHAR(20) NOT NULL,
  feature VARCHAR(40) NOT NULL,
  allowed TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (plan, feature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO entitlements (plan, feature, allowed) VALUES
 ('free','challenges.all',1),
 ('free','progress.sync',1),
 ('free','solutions.view',1),
 ('free','daily.streaks',1),
 ('free','tracks.advanced',1),
 ('free','sandbox.python',1),
 ('free','teams',1);

CREATE TABLE IF NOT EXISTS auth_attempts (
  id         VARCHAR(16) NOT NULL,
  ip_hash    VARCHAR(24) NOT NULL,
  action     VARCHAR(20) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_attempts_ip (ip_hash, action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The Papyrus subscriber list. It used to be an append-only JSONL file under
-- api/_private/, which Hostinger's deployment deleted on EVERY push (the folder
-- is gitignored, so it is not in the repo, so a deploy removes it). Real
-- subscriber emails were being destroyed silently. Rows in a database are
-- outside the deploy path, so they survive.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email        VARCHAR(254) NOT NULL,        -- stored lower-cased
  created_at   VARCHAR(32) NOT NULL,
  ip_hash      VARCHAR(32) NULL,             -- coarse abuse signal, never a raw IP
  unsubscribed TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
