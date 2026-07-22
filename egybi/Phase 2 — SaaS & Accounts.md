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


---

## The auth dialog & Google Sign-In (2026-07-20)

### The dialog — "The Threshold"
Rebuilt from a plain centred card into two zones: a `--kemet` rail carrying the ankh, the promise and one proof number, and a `--papyrus-2` form panel. Gold and the hieroglyphs sit on the dark surface they were drawn for; typed input stays on the light surface where it is most legible. At 720px the rail becomes a header strip and `.auth-rail-sub` is dropped. Two other directions were considered and rejected: a papyrus "sealed letter" (reads as marketing, wrong for a password form) and a dark console (input contrast fights the gold).

One shell now serves **four** views — sign in, create account, forgot, set-new-password — with a crossfade and an animated height change, so switching never feels like separate screens. `openResetModal()` is just the shell opened on the fourth view.

Built in: focus trap with restore to the triggering element, Escape + backdrop close, `role="dialog"` + `aria-modal` + `aria-labelledby`, a `role="alert"` region for errors and a separate `role="status"` for successes, per-field `aria-invalid`/`aria-describedby`, blur-time validation that clears as soon as the input becomes valid, password show/hide with `aria-pressed`, a busy state that hard-blocks double submission, and every animation gated on `prefers-reduced-motion`.

**The strength meter is deliberately honest.** Length is weighted far above character variety, because that is what actually buys entropy; obvious patterns are forced to Weak however long they are; and it only appears on the two views where a NEW password is being chosen — judging a password on the sign-in view, where it cannot be changed, is noise. `password1` gives Weak, `P@ss1!xy` gives Fair, a three-word passphrase gives Strong.

### Google Sign-In
`site/auth/google.php` + `google_verify.php`, using Google Identity Services. **Config-gated:** with no `google_client_id` the button never renders and both endpoints return 501. There is no client *secret* in this flow, so there is none to leak.

Verification, all fail-closed:
- **RS256 only** — accepting `none` or the HS* family is the classic algorithm-confusion bypass.
- Signature checked against Google's JWKS matched by `kid`, cached 6h in `_private/google_jwks.json`, with one forced refresh on a kid miss so key rotation self-heals.
- `iss`, `aud` (must be our client id, otherwise a token minted for a different Google app would be accepted), `exp`, `iat` with 60s skew.
- A single-use **nonce** issued by `?action=nonce`, consumed before verification, blocking replay inside the token lifetime.
- If the local RSA path cannot run at all, it falls back to Google's `tokeninfo` endpoint — authoritative, not a downgrade — and every claim is re-checked against that response.

**Account-linking policy (the decision worth remembering):** a Google sign-in for an email that already has a password account is linked **only when Google asserts `email_verified: true`**. Refusing outright would strand someone who legitimately owns both. Linking on an *unverified* claim would let anyone who registered a Google account carrying someone else's address walk straight into that account — a full takeover. A verified claim is exactly the proof our own emailed link provides, so accepting it is consistent rather than a shortcut. Unverified gives 409 and "sign in with your password".

`google_sub` (not email) is the link key, since `sub` is immutable and emails change. Added by an additive migration that runs on MySQL and SQLite alike. Google-only accounts store a **non-hash sentinel** in `pass_hash` (`PASS_NONE`), so they can never be reached by password; login rejects it explicitly but still returns the generic "wrong email or password", because naming the reason would leak that the address is registered. Those users can adopt a password through the ordinary reset flow.

Sessions are created with the same shape as password login, so XP, streaks, rank and the solved set carry through a Google signup unchanged — verified end-to-end: a signup with 2 locally-solved challenges arrived as 20 XP / streak 1 / Apprentice Scribe at 20%.

### Where the auth styling lives (2026-07-20, corrected)
Initially the dialog shipped with its CSS as a 126-line JS string injected at runtime from `auth.js`. That kept the component self-contained but put a whole design surface outside the design system. It now lives in **`site/assets/egybi.css`**, in a section called "accounts & the auth dialog" at the very END of the file.

**Keep it last.** The injected `<style>` used to load after the `egybi.css` link and so won every equal-specificity tie; `.auth-rail-glyph` and `.glyph` are both (0,1,0), and moving the block earlier would silently shrink the rail glyph from 2.1rem to the base 1.36em.

The move also removed two duplications where the injected copy was the weaker one: `.hp-field` (egybi.css already had it *with* `pointer-events:none`) and `.acct-slot` (egybi.css lacked the `position:relative` the account dropdown anchors to, so that rule was extended in place rather than duplicated).

Because the styling and the markup now live in different files, **cache-bust both together** — a visitor holding new `auth.js` with a cached old `egybi.css` gets a completely unstyled dialog. Both are at `v=9`.

### Four bugs found while verifying — worth not repeating
1. **`addEventListener('click', openModal)` passes the click Event as the first argument.** It matched no known view, fell through the if/else chain, and a button labelled *Sign in* opened *"Choose a new password"*. The previous modal had a quieter version of the same bug (`mode` became an Event, so a sign-in submitted as a signup). `openModal` now validates its argument against the known view set.
2. **`overflow: hidden` is not an axis-safe scroll lock.** The dialog measured 403px inside a 360px phone with both edges clipped. The cause was not the dialog — it was the overlay, sized 435px despite `position:fixed`, because the scroll lock's `body.style.overflow='hidden'` clobbered the `overflow-x: clip` that egybi.css sets. Body became a horizontal scroll container sized to its content, and a fixed child took its size from that. Lock only `overflow-y`.
3. **`[hidden]` loses to an author `display`.** With Google off, the slot and its "OR" divider still rendered — an empty gap and a divider dividing nothing — because both declare `display:flex`, which beats the UA `[hidden]{display:none}`. DOM assertions passed (`element.hidden === true`) and only the screenshot caught it. Every toggled element now carries an explicit `[hidden]` guard.
4. **`min-width:auto` on flex/grid items** refuses to shrink below content min-content — fixed with `min-width:0` and `minmax(0,1fr)`.

After #2, note that "the page cannot scroll sideways" no longer proves "nothing overflows" — `overflow-x: clip` hides the symptom.

Related: [[Frontend & Design System]] - [[Brand & Creative Identity]] - [[Changelog]]


---

## ⚠ CRITICAL: every deploy destroys `_private/` (found 2026-07-20)

**Hostinger's git deployment replaces `public_html` with the repository contents. `_private/` is gitignored, so it is not in the repository, so every single `git push` deletes it.** `lib.php` then self-initialises a fresh empty database on the next request, which is exactly why this went unnoticed — nothing ever errors, the accounts simply cease to exist.

**Proven, not inferred.** A one-line change to `robots.txt` was deployed with nothing else touched. The SQLite file's creation time moved from `01:14:12` to `01:16:06`, and the rebuilt file contained zero users. Two calls five seconds apart with no deploy in between returned an identical creation time, so the file survives requests fine — it is specifically the deploy that destroys it.

### What is inside the blast radius

| Path | What is lost on every push |
|---|---|
| `site/auth/_private/auth.sqlite` | every account, XP total, streak and solved-challenge row |
| `site/api/_private/newsletter.jsonl` | every Papyrus subscriber's email address |
| `site/auth/_private/config.php` | MySQL credentials, SMTP password, Google client id |

The third row is the one that bites hardest, because `DEPLOY.md` and the Google Sign-In setup both instruct you to create `config.php` in exactly that folder. It would be deleted by the next push, and the site would silently fall back to SQLite with email sending and Google sign-in switched off — no error, just quietly degraded.

This also explains a detail that looked innocent at the time: the live diagnostics reported `driver: sqlite` even though `config.sample.php` defaults to `mysql`. There was no `config.php` on the server, because there cannot be one.

### The fix (needs a decision, not applied yet)

**Recommended: move the state off the filesystem entirely.**

1. **Auth data to MySQL.** `schema_auth_mysql.sql` already exists and the code is portable across both engines. MySQL data lives outside `public_html`, so a deploy cannot touch it. Hostinger's plan includes 150 databases.
2. **Credentials to hPanel environment variables, not `config.php`.** `auth_cfg()` already reads env vars as a fallback — `AUTH_DB_DRIVER`, `AUTH_DB_NAME`, `AUTH_DB_USER`, `AUTH_DB_PASS`, `APP_SECRET`, `SMTP_*`, `GOOGLE_CLIENT_ID`. Environment variables survive deploys and never enter the repository, which solves the chicken-and-egg problem of a config file that holds the credentials but is itself deleted.
3. **Newsletter subscribers** need the same treatment — either a MySQL table or a path outside `public_html`. `newsletter.php` currently hardcodes `__DIR__ . '/_private'`, so this one needs a code change rather than configuration.

**Alternative if staying on SQLite:** point `AUTH_SQLITE_PATH` at a directory *above* `public_html` (e.g. `/home/uXXXXXXXX/private/auth.sqlite`). The deploy only replaces `public_html`, so anything above it survives. Cheaper to do, but leaves the newsletter file needing the same treatment.

**Do not** commit `config.php` to make it survive. That puts the database password, the SMTP password and `APP_SECRET` into git history permanently.

### How much real data has been lost

Probably little, because the site has had almost no traffic yet and no `config.php` was ever created — but any Papyrus subscriber who signed up before 2026-07-20 is gone, and so is any account created before then. Worth knowing before launch traffic arrives, which is precisely when it would have started mattering.


### Fixed in code, 2026-07-20 — pending the hPanel step

All four stores now share one durable database instead of the deploy-wiped folder:

| Store | Was | Now |
|---|---|---|
| accounts / XP / streaks | `auth/_private/auth.sqlite` | `users` etc. in the shared DB |
| Papyrus subscribers | `api/_private/newsletter.jsonl` | `newsletter_subscribers` |
| community notes | `api/_private/community.jsonl` | `community_notes` (still `approved=0` gated) |
| analytics + its key | `api/_private/analytics.sqlite` + `.key` | `hits` table + `ANALYTICS_KEY` env var |

Code changes: `storage_durability()` reports whether the store survives a deploy and `error_log`s loudly when it does not — silence is what let this hide, so silence is what got fixed. `durable_db()` exposes the shared store to the write-side API endpoints, each of which falls back to its old file **only** when no durable store is configured, and logs that the data will not survive. MySQL now self-initialises from `schema_auth_mysql.sql` on first request, so going live needs no phpMyAdmin import. A new `GET auth.php?action=health` reports driver, durability and row counts, with no secrets — previously there was no way to ask "is my data actually persisting?" without writing a throwaway script.

**Verified live:** health reports `durable: false` with the reason, which is correct until the env vars are set; a newsletter signup moved the subscriber count 0 → 1 through the new database path and the duplicate was recognised; all pages 200, private paths 403, 123/123 challenges pass.

**Still needs Ahmed (I cannot reach hPanel):** set `AUTH_DB_DRIVER=mysql` + `AUTH_DB_NAME/USER/PASS`, `APP_SECRET`, `APP_URL`, `AUTH_SECURE_COOKIE=1`, `ANALYTICS_KEY`, and the `SMTP_*` set, in hPanel → Advanced → PHP Configuration → Environment Variables. Then reload the health URL and confirm `"durable": true`. Until that is done the data is still ephemeral — the code cannot fix that on its own, it can only stop hiding it.

Docs corrected: `GO-LIVE.md` Step 4 (which previously stated a redeploy would "not touch" `_private/` — the false claim that caused this), `backend/DEPLOY.md` Step 11.3, and `config.sample.php`, which now opens with a box saying not to use it on Hostinger.


### CONFIRMED FIXED — 2026-07-20, proven end to end

`egybi-config.php` now sits at `/home/u765296196/domains/egybi.com/egybi-config.php`, beside `public_html` rather than inside it, pointing at MySQL. Health reports `driver: mysql`, `durable: true`, `schema_errors: none`.

**The proof, not an assertion.** Created a real account, solved three challenges (10+20+40 = 70 XP, streak 1, Apprentice Scribe) and subscribed an address. Deployed a change and *waited for it to actually land* — then re-checked: counts identical, login still worked, XP and rank intact. Test rows removed afterwards; the database is back to empty.

**Three more bugs surfaced during that hour, all of them mine:**

1. **The "durable" label lied.** It only checked the path was not `_private/`, so a config sitting *inside* `public_html` was reported as durable — and was then deleted by the next push. The real test is whether the path is inside the deployed tree. `deploy_root()` is `dirname(dirname(__DIR__))`, deliberately **not** `DOCUMENT_ROOT`: the root `.htaccess` rewrites into `site/`, so the document root is one level too deep and a file in `public_html` itself would look "outside the web root". The SQLite durability check had the same flaw.

2. **`auth_config_file()` took the first candidate while walking up**, which would pick the doomed `public_html` copy over a correct one above it. It now collects all candidates and prefers one outside the deployed tree.

3. **A semicolon inside an inline SQL comment broke the schema.** `run_schema()` split on `;` and stripped only full-line comments, so this line —
   `google_sub VARCHAR(64) NULL,  -- Google's immutable user id; NULL for password-only`
   — cut the `CREATE TABLE users` in half and both halves were invalid (MariaDB error 1064). Replaced with `split_sql_statements()`, which tracks quote state, `--`/`#` line comments and `/* */` blocks. **The offending comment is deliberately left in place as a live regression test.**

   Worth noting: my first guess was an InnoDB key-length problem, and I was wrong. What actually found it was making `run_schema()` *record* errors instead of swallowing them — the same lesson as the original bug. Silence was the defect both times. The prefix indexes added on that wrong guess were kept anyway, because a `VARCHAR(254)` utf8mb4 unique index genuinely does exceed the 767-byte limit on hosts using COMPACT/REDUNDANT row formats.

**Also learned:** `robots.txt` is served from a standalone file at the document root, not from the repo, so it is useless as a deploy marker. Use a repo-served asset (e.g. a comment in `assets/glyphs.js`) when you need to confirm a deploy has landed.

Health now prints `put_config_here` and `deployed_folder` with absolute paths whenever something is misconfigured — "above public_html" is ambiguous prose, an absolute path is not.

**Remaining, optional:** SMTP (`mail: false`) and Google (`google: false`) are still unset in `egybi-config.php`. Both are inert and safe until filled in.


### SMTP live — 2026-07-20

`egybi-config.php` now carries the Hostinger SMTP settings; health reports `mail: true` and `auth.php?action=mail-test` returns `ok: true` with no error. Verification and password-reset mail is really sent rather than logged.

**Deliverability, checked rather than assumed.** DNS was already correct — SPF (`v=spf1 include:_spf.mail.hostinger.com ~all`), DMARC (`p=none`) and MX to `mx1/mx2.hostinger.com` are all present. **DKIM was NOT found on eight common selectors** (`hostingermail1/2`, `default`, `mail`, `dkim`, `hostinger`, `x`, `smtp`) — worth enabling in hPanel → Emails → DNS/Configuration, because Gmail and Outlook increasingly require it and its absence pushes mail toward spam.

**Mailer changes that decide inbox vs spam** (setting credentials only makes mail *send*): added `Date:` and `Message-ID:` headers — both were missing, and their absence is a strong spam signal some providers act on outright; switched to `multipart/alternative` with a generated `text/plain` part, since HTML-only scores worse and shows nothing in clients that refuse HTML; `Reply-To` now follows `smtp_user` instead of being hardcoded.

**Failures are now diagnosable.** Previously a failed send logged the single word `auth` — a wrong mailbox password looked identical to a blocked port. Each SMTP step now records the server's own reply via `mail_last_error()`, and failures go to `error_log` as well as `_private/mail.log` (that file is inside `public_html`, so a deploy erases it — it must never be the only copy).

**`auth.php?action=mail-test`** proves SMTP without waiting for a user to report a missing link. Gated two ways so it cannot become an open relay: it requires the analytics key, and **the recipient is not read from the request** — it always sends to the configured `smtp_user`. Verified 403 with no key and with a wrong key.

**Full flow verified live:** signup (verification mail triggered) → login → solve + sync (30 XP, 2 solved) → password-reset request. Security spot-checks held: wrong password gives the generic reply, a reset for an unknown address gives an identical reply (no enumeration), progress without CSRF returns 403, an invalid verify token is rejected. Test account removed afterwards.

**Remaining optional:** `google_client_id` (Google button stays hidden until set) and DKIM.


### Google Sign-In live — 2026-07-20

`google_client_id` set in `egybi-config.php`; health reports `google: true`, the nonce endpoint issues nonces, and the button renders as a genuine `accounts.google.com` iframe with the official mark. Junk credentials are rejected (`"Could not verify that Google sign-in."`).

**The crypto was security-tested before enabling**, because it had never run and it guards account takeover. Tested offline against a locally generated RSA key planted as the JWKS cache:

- `jwk_to_pem()` produces a **byte-identical** PEM to the real public key — the hand-rolled DER encoding is correct, which was the highest-risk part.
- A genuinely signed token is accepted, email lower-cased, `sub` extracted.
- Rejected: `alg=none`, `alg=HS256` (algorithm confusion), forged signature, payload swapped onto an old signature, stripped signature, wrong `aud`, wrong `iss`, expired, nonce mismatch, missing nonce, garbage, empty, and an empty client id.
- `email_verified: false` is **accepted and reported as false** across all encodings (`false`, `"false"`, absent) — this matters, because the linking policy needs to receive it and then refuse rather than have the token rejected outright.

**Button locale.** GIS picks a locale from the connection when none is given, which rendered an **Arabic** button inside an entirely English dialog. Now takes `locale` from `<html lang>`, so it matches today and follows automatically if the site is ever made bilingual.

**Note on the Google Cloud project:** the consent screen must be **published**, not left in *Testing* — while testing, only manually-added test users can sign in. Scopes are the non-sensitive defaults (`email`, `profile`, `openid`), so publishing needs no Google review. No client secret exists in the ID-token flow.

Verified after enabling: all 9 pages 200, 123/123 challenges pass, no console errors, no real horizontal overflow (the two off-canvas honeypots inflate `scrollWidth` but nothing is visible past the edge and `scrollLeft` cannot move), no client id in the repo.


---

## The Papyrus — automated newsletter sending (2026-07-20)

The site collected subscribers from launch but could not *send*. This adds an
automated, compliant, idempotent sending path on the same Hostinger PHP/MySQL
stack, reusing `auth/mailer.php` (Hostinger SMTP). Full build in [[Changelog]].

**Data model (self-initialising via `newsletter_ensure_schema()` in `lib.php`, and in both schema files):**
- `newsletter_subscribers` gained `confirmed`, `token`, `confirmed_at`, `unsubscribed_at` (double opt-in). Legacy single-opt-in rows are grandfathered confirmed + given a token.
- `newsletter_issues` — one row per letter (`draft → sending → sent`).
- `newsletter_sends` — **PK `(issue_id, email)`; its existence IS the guarantee a resend can never mail the same person twice.**

**Endpoints:**
- `api/newsletter.php` — signup now stores UNCONFIRMED and emails a confirmation link; `?action=confirm` is the double-opt-in landing.
- `api/unsubscribe.php` — per-recipient link + RFC 8058 one-click (`List-Unsubscribe` / `List-Unsubscribe-Post`). CAN-SPAM / GDPR.
- `api/send_issue.php` — **dry-run by default**, **`ANALYTICS_KEY`-gated** (`hash_equals`), throttled batches, records each send. Reads a versioned issue file `newsletter/issues/<slug>.json`.

**Trigger:** the **"Send The Papyrus" GitHub Action** (`workflow_dispatch`, dry/live) loops batches until every confirmed subscriber has exactly one copy.

**To go live (needs Ahmed):** set the `ANALYTICS_KEY` GitHub Actions secret to the *same value* as the server's `egybi-config.php` `analytics_key`, then run the Action in `dry` mode to preview before the first `live` send. The mailer gained an injection-hardened optional `$extraHeaders`. Verified: PHP lint + a SQLite flow harness (subscribe → confirm → confirmed-only recipients → idempotent send-log → unsubscribe) + endpoint checks (dry-run sends nothing, wrong key → 403, one-click unsub works). Live SMTP/MySQL send is the one thing that needs a real run to confirm.

### ✅ Live & operational (2026-07-21)
The "needs Ahmed" note above is **done**: `ANALYTICS_KEY` is set, and the **welcome issue was sent live** — 2 confirmed subscribers, 2 sent / 0 failed / 0 remaining (the `(issue_id,email)` send-log made it safely idempotent). A dry-run previewed the count first.
- **Eighteen-issue backlog** in `site/newsletter/issues/` (monthly through Dec 2027): `2026-07-welcome` (sent), `2026-08-hepatitis-c`, `2026-09-suez-canal`, `2026-10-tourism-rebound`, `2026-11-benban-solar`, `2026-12-egx`, `2027-01-remittances`, `2027-02-nile-water`, `2027-03-new-capital`, `2027-04-grand-egyptian-museum`, then H2-2027: `2027-05-squash`, `2027-06-cinema`, `2027-07-el-dabaa-nuclear`, `2027-08-wheat`, `2027-09-young-country`, `2027-10-moving-100-million`, `2027-11-aswan-high-dam`, `2027-12-football`. Each is a single-story, fully-cited data letter in the blog's "Egypt, told through its data" voice; the market ones stay education-not-advice (FRA line). New issue = drop a `<slug>.json`, run the Action `dry` then `live`.
- **Monthly send reminder** (does NOT send — just nudges): Claude-Code-Remote trigger `trig_018YA7TYh5jKXRzQNWoNcV9r`, cron `0 7 1 * *` (1st of month, 07:00 UTC), push+email, fresh-session. It reads `newsletter/issues/`, finds the current month's slug, and messages Ahmed the exact send steps.
- The send runs on a GitHub runner (reaches live SMTP/MySQL); the dev sandbox cannot. This closes the "live SMTP/MySQL send needs a real run" caveat above — it ran.
