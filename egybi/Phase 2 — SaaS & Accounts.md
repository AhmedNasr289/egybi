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
