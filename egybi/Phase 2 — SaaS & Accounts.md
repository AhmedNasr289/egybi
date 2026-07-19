# Phase 2 — SaaS & Accounts

> The first stateful layer on EgyBI: real accounts, per-account progress that syncs across devices, and paywall-ready gating — shipped **free at launch**, architected so turning paid tiers on later is a config change. Built on the existing Hostinger PHP 8 / MySQL stack, isolated from the read-only knowledge-base API. Back to [[Home]] · see [[Changelog]].

## Decision: stay on Hostinger PHP/MySQL (no rebuild)

Real auth needs server sessions, a users table, password hashing and rate limiting — all of which **PHP 8 + MySQL on the existing Unlimited plan does cleanly**. There is no need to adopt React/Supabase and rebuild the static site. So the SaaS layer is a **new, isolated module** (`backend/auth/`) beside — never inside — the read-only KB API (`backend/api/`, which stays SELECT-only). The static frontend stays static; it talks to the auth endpoints over `fetch`.

Portability choice: every table uses an **app-generated random-hex TEXT primary key** (`bin2hex(random_bytes(8))`), so the exact same schema runs on MySQL (production) and SQLite (local test) with no `AUTO_INCREMENT`/`AUTOINCREMENT` divergence. All DB access is **PDO with prepared statements**.

## Data model (`backend/auth/schema_auth.sql`)

- **users** — `id, email (unique, lower-cased), pass_hash (Argon2id), email_verified, plan (default 'free'), created_at, updated_at`.
- **auth_tokens** — `token (PK, 32-byte random), user_id, kind ('verify'|'reset'), expires_at, used, created_at`. Single-use, time-limited.
- **sessions** — `id (PK, 32-byte random = the cookie value), user_id, csrf (per-session token), ua_hash, expires_at, created_at`. The session id is the secret in the cookie; `csrf` is required on every state-changing request (double-submit).
- **user_progress** — `user_id, challenge_id, solved_at`, `PRIMARY KEY(user_id, challenge_id)`. One row per solved challenge; the future home of XP/streaks too.
- **plans / entitlements** — `entitlements(plan, feature, allowed)`, `PRIMARY KEY(plan, feature)`. Every feature is seeded `allowed=1` for `free` at launch. Gating is a table lookup, so a paid tier is added by inserting rows, not editing code.
- **auth_attempts** — `id, ip_hash, action, created_at`. Cheap rate-limiting: count recent rows per (ip, action).

## Auth flow & security controls

- **Signup**: `password_hash($pw, PASSWORD_ARGON2ID)`; email stored lower-cased & unique; a `verify` token is created and emailed (see "mailer" caveat). Honeypot field, min password length, rate-limited.
- **Verify**: single-use, expiring token → sets `email_verified=1`.
- **Login**: `password_verify`; on success mint a `sessions` row and set an **HttpOnly, Secure, SameSite=Lax** cookie holding the session id; return the session's `csrf` to the client. Generic error text — never reveal whether the email exists.
- **Logout**: delete the session row + clear the cookie.
- **Password reset**: `request-reset` always returns the same generic success (no account enumeration); a single-use expiring `reset` token lets the user set a new hash; all of that user's sessions are invalidated on reset.
- **Every state-changing request** (progress save, logout, reset-confirm) requires the session cookie **and** a matching `X-CSRF` header (double-submit against `sessions.csrf`).
- **Per-user scoping**: every progress query is filtered by the authenticated `user_id` from the session — a user can only ever read/write their own rows.
- **Rate limiting** on signup/login/reset by ip-hash; **prepared statements everywhere**; secrets (DB creds, payment keys) come from env, never the repo.

## Progress: per-account, without breaking anonymous use

Anonymous visitors keep solving exactly as today — progress in `localStorage` (`egybi_solved`), no login required to "try a challenge before signing up". When a user **logs in**, the client:
1. `POST /auth/progress.php` with the local solved set → the server **merges** it into `user_progress` (union, never deletes).
2. `GET /auth/progress.php` → the server's full solved set, merged back into the local set + UI.
So progress now syncs across devices for signed-in users, and nothing is lost at the anonymous→account boundary.

## Free-vs-paid (all FREE at launch, config-gated)

Capability matrix lives in the `entitlements` table. At launch every row is `free = allowed`. The intended future split (turned on later by inserting `pro` rows, exactly like the AdSense config-gate stays inert until a key is set):

| Capability | Free (launch) | Pro (later) |
|---|---|---|
| All 97 SQL challenges | ✓ | ✓ |
| Cross-device progress sync | ✓ | ✓ |
| Reference solutions / hints | ✓ | ✓ |
| Daily challenge, streaks, leaderboard | ✓ | ✓ |
| Advanced tracks, certificates | ✓ | (Pro) |
| Python/pandas sandbox | ✓ | (Pro) |
| Teams / classroom | ✓ | (Pro) |

## Pricing (drafted, OFF at launch)

Payments run through **Paddle or LemonSqueezy** (merchant-of-record; pays out to Egypt — Stripe does not), priced in **EGP + USD**, config-gated OFF until a real key is set (`PAY_ENABLED`). Indicative Pro tier: **~EGP 149/mo (~US$3)** or **~EGP 1,290/yr**, founder pricing for the first cohort. No payment code executes until enabled; a Paddle/LemonSqueezy webhook (`payments.php`) will set `users.plan` / `entitlements` on subscribe.

## Gamification — XP, streaks, rank (built on `user_progress`)

- **XP** is difficulty-weighted: Easy 10, Medium 20, Hard 40. The client sends a `{challenge_id: points}` map on sync (from the catalogue); the server stores `points` per solved row and sums them. XP = `SUM(user_progress.points)`.
- **Streaks**: a `user_stats` cache tracks `current_streak` / `longest_streak` / `last_active_day` (UTC). On each solve, the first activity of a new day advances the streak if the last active day was yesterday, else it resets to 1. Read-only calls never advance it.
- **Rank** is a themed scribe ladder derived from XP: Apprentice Scribe (0) → Scribe (100) → Cord-Stretcher (300) → Master Scribe (700) → Keeper of the House of Life (1500) → Vizier of Data (3000), with a "next tier" and progress-% for the UI bar.
- **Leaderboard** (`stats.php`, read-only): top 10 by XP showing only the public `display_name` (auto-set to `Scribe-XXXX` at signup, renamable later) — **never the email**. Verified: the leaderboard JSON contains no email field.
- **UI**: the account menu shows XP / streak / solved / rank; the Practice page gets a profile strip (rank, XP, a gold progress bar, streak). Stats are returned by `me`, `progress` (GET+POST), and `stats.php`.

## Status & what needs Ahmed before go-live

- **Production-ready:** the schema, PDO auth endpoints (signup/verify/login/logout/reset), CSRF + sessions + rate-limiting + per-user scoping, the progress-sync endpoint, entitlement checks, and the account UI — all free.
- **Needs your action to go fully live:** (1) a **mail sender** for verification/reset emails (Hostinger SMTP or a service) — until then tokens are logged for manual/dev use; (2) a **Paddle/LemonSqueezy key** if/when you switch paid tiers on; (3) set the MySQL creds + `APP_SECRET` as env vars on Hostinger.

## Decisions & open questions
- Session store in MySQL (chosen) vs PHP native sessions — chose a DB session table for cross-instance clarity and easy invalidation-on-reset.
- OAuth (Google/GitHub) sign-in — deferred; email+password first.
- When to introduce the first paid tier — after an audience exists (see [[Business Model & Pricing]]); the plumbing is ready now.
