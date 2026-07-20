# Security Posture & Audit Log

> Full security review of the live site, 2026-07-20, covering the PHP auth module, the public API, deployment exposure and secret handling. Everything found was fixed and verified against production the same day. This note records **why** each control exists and, just as importantly, **which findings were wrong** — so nobody re-opens a settled question or "fixes" something that was already correct. Back to [[Home]] · see [[Phase 2 — SaaS & Accounts]] · [[Backend & Knowledge Base]] · [[Changelog]].

## How the review was run

Two independent code audits (auth module; public API + secrets + deployment) plus direct probing of the live site. Findings were **not** taken on trust — each was re-checked against the actual code or measured before acting. That mattered: three of the reported findings turned out to be wrong, and one of the corrections inverted the direction of the bug.

Commits: `5d2ca30` (headers) · `661abc0` (CSP fix) · `a7cae50` (Google + reset tokens) · `3ff72b0` (beacon, health, login timing) · `5ed7124` (sessions, CSRF, error masking).

## What was already right

Worth stating plainly, because it is the strong part of this codebase and should not be disturbed:

- **No secret has ever been committed.** Verified across all 400+ commits. `.gitignore` is correctly scoped; only placeholder templates are tracked. The "config lives above `public_html`" design is the right answer to Hostinger's destructive deploy model.
- **No SQL injection anywhere.** Every query carrying user data uses PDO prepared statements with `ATTR_EMULATE_PREPARES => false`. Dataset names are whitelisted; chart queries are fixed string literals.
- **The Google JWT verifier is genuinely correct.** Strict `RS256` allowlist checked *before* any signature work, closing both `alg:none` and HS256-with-RSA-public-key. `iss`/`aud`/`exp`/`iat` all enforced, and re-checked independently on the tokeninfo fallback path.
- **No IDOR.** Every authenticated query scopes to the session's own `user_id`.
- **All tokens come from `random_bytes`.** No `rand`, `mt_rand` or `uniqid` anywhere in the module.
- **`mail-test` cannot be an open relay** — the recipient is pinned to config and never read from the request.

## The pattern behind the real findings

Almost every genuine issue was the same shape: **a control that existed but was optional or unenforced.**

- The Google nonce was validated *only if the client volunteered one* — omit the field and replay protection silently disappeared.
- `email_verified` gated account *linking* but not account *creation*, leaving squatting open.
- `ua_hash` was written at login and never compared, so the column was decorative.
- The anti-enumeration dummy hash was miscalibrated badly enough that it *became* the oracle it was written to prevent.
- Rate limiting was real but keyed only on IP, which a botnet or a single IPv6 /64 bypasses entirely.

The lesson for future work: **a control that can be skipped by the caller is not a control.** When adding a security check, the failure path must be the default, not the opt-out.

## Fixes, and the reasoning worth keeping

### Google sign-in
- **Nonce is mandatory.** Previously `if ($nonce !== '' && ctype_xdigit($nonce))` — an attacker simply omitted it and a stolen ID token was replayable for its full ~1h life. Safe to require: `assets/auth.js` already fetches a nonce before rendering the button and throws if it cannot.
- **Creation requires `email_verified`,** not just linking. Otherwise a squatter minted an account on someone else's address, and the real owner's later signup silently no-ops on the duplicate email — so they never learn why they cannot register.
- **Password reset clears `google_sub`.** Proving mailbox control must *sever* any Google link, or a squatter keeps permanent invisible co-ownership. Re-linking is one click; silent shared access is unrecoverable. (`google_sub` is nullable and MySQL exempts NULLs from the UNIQUE index, so this cannot collide.)
- **`require_verified` is honoured here too.** It was checked on the password path only, so the flag appeared enforced while one of the two doors ignored it.

### Sessions
- **Ids are stored as `sha256(cookie)`.** Raw storage meant any read of the table — backup, dump, SQLi elsewhere — was instant silent impersonation with nothing to crack. sha256 hex is 64 chars, exactly the existing `VARCHAR(64)`, so no migration was needed.
- **`destroy_session` was split in two.** This is the subtle one. Once ids are hashed, lib callers hold the *raw cookie* while `auth.php`'s logout holds the *fetched row's key*. A single function taking "the id" silently no-ops for whichever caller passes the wrong value — logout appearing to succeed while the session stays alive. Hence `destroy_session(raw)` and `destroy_session_key(stored)`. **If you add a caller, be deliberate about which one you need.**
- **7-day idle window** sliding on use, **30-day absolute cap** from `created_at`. The slide only writes when it moves by more than an hour, so an active session does not cost a write per request.
- **`ua_hash` is compared.** Accepted trade-off: a browser that changes its User-Agent mid-session (a version bump) is logged out.

### Everything else
- **`hit.php` capped at 600 writes/day per IP**, 180-day retention. It takes unauthenticated writes and now shares a database with auth, so an unbounded flood filled the shared MySQL quota and took *login* down with it. The cap keys on **IP+day, not `visitor`** — `visitor` mixes in the User-Agent, so UA rotation would mint a fresh bucket per request. Required an explicit `ALTER TABLE` for both engines: `CREATE TABLE IF NOT EXISTS` is a no-op against the existing production table, so the cap would otherwise have been silently dead.
- **`health` is key-gated** with an ungated `{"ok":true}` liveness reply. It leaked absolute server paths — including the Hostinger account id — plus raw schema error text and live row counts.
- **CSRF origin guards on login/signup.** They run before a session exists, so `require_csrf` had nothing to compare and `SameSite=Lax` does not block a top-level form POST. An attacker could log a victim into the *attacker's* account and harvest their solves. Prefers `Sec-Fetch-Site`, falls back to `Origin`, allows requests with neither so non-browser clients still work.
- **`api/index.php` no longer echoes `getMessage()`** — it returned PDO driver text, database name, and the absolute `sqlite_path`.
- **Newsletter and community throttled** 5/hour per IP. Moderation stops publication, not the write; CORS stops *reading* the reply, not the write.
- **Security headers** set with `always` so they apply to our error responses too — where an attacker actually spends their time. Caveat found while verifying: this covers responses **Apache** generates. Hostinger's edge serves its own 404 page for some paths, and nothing in `.htaccess` can attach headers to that.

## Corrections — findings that were WRONG

Recorded deliberately. Each of these looked plausible and was reported confidently.

1. **"Real hashes are bcrypt cost 10, the dummy is cost 12, so unknown users are ~4× slower."** Wrong. `PASSWORD_DEFAULT` is **cost 12** on this PHP, so the old dummy matched the bcrypt path exactly (190.8 ms vs 191.9 ms measured). The real leak was that `hash_password` *prefers Argon2id* at 258.6 ms — so **existing** accounts were ~68 ms slower, the opposite direction. Fixed by making `dummy_hash()` branch on the host's algorithm; measured delta is now 2.4 ms.
2. **"`rate_ok` has an off-by-one; `<=` allows `$max + 1`."** Wrong. The count includes the just-inserted row, so `max=10` allows ten and blocks the eleventh — confirmed by simulation and against the live endpoint. Code unchanged; only the comment was corrected.
3. **"Two CSP headers will both apply and intersect."** My own error, caught live. `Header always set` **replaces** the host's injected `upgrade-insecure-requests` rather than adding a second header, so adding ours silently dropped a control. Now restated inside our own policy.

Measurement note: the first timing run was itself wrong — the shell interpolated `$U20Hyu2lJ` inside double quotes and corrupted the hash, so `password_verify` returned early on a malformed value and reported 0.2 ms. **Put PHP test snippets in a file; do not inline hashes containing `$` into a bash double-quoted string.**

## Regression tests

`backend/test/session_test.php` — 14 assertions over the session lifecycle, including that a **stolen DB key is not replayable as a cookie**. Run it before touching `create_session` / `current_session` / `destroy_session`.

Needs `pdo_sqlite`, which the default Windows `php.ini` leaves off. Load it per-run rather than editing the ini:

```
php -d extension_dir=C:/php/ext -d extension=php_sqlite3.dll \
    -d extension=php_pdo_sqlite.dll backend/test/session_test.php <tmp.sqlite>
```

## Known, accepted, not fixed

- **The insights key travels in a query string** (`?key=…`), so it lands in Hostinger access logs, browser history, and any proxy in path. The comparison itself is correct (`hash_equals`, with a fail-closed length pre-check). Mitigation for now is **periodic rotation**; the real fix is a POST + HttpOnly cookie.
- **`fetch_prices.py` uses plaintext HTTP with `CERT_NONE`** because the IDSC government host offers nothing better. Anyone who can MITM the GitHub-runner→IDSC path controls JSON that auto-commits and auto-deploys. Impact is content-only (rendered as data, never as code) and the count-collapse guardrail catches an empty response — but **not** a plausible-looking poisoned one. Pinning expected item names and value ranges would close it.
- **`.htaccess` protections mostly live inside `<IfModule mod_rewrite.c>`.** The non-rewrite fallbacks were extended (`.py`, `.yml`, `.csv`, `.key`, …) and a `mod_alias` `RedirectMatch` added for `egybi`/`backend`/`.git`, so the directory deny no longer rests on the same module assumption as everything above it.

## If you are picking this up cold

Re-run the live sweep before assuming anything still holds — hosting configuration changes underneath you:

- All pages 200; `.git/`, `backend/`, `egybi/`, `_private/` and `lib.php` all 403/404.
- 6/6 security headers present, **including on our own 403s** — check `/auth/lib.php`, not `/backend/`. Since the `mod_alias` rule was added, `/backend/` returns 404 and Hostinger's **edge** serves that error page, which carries none of our headers (identifiable by `platform: hostinger` and a `last-modified` from 2025). That is outside our control and harmless — the page has no content and no interaction — but it makes `/backend/` a misleading thing to test headers against.
- `google.php?action=signin` without a nonce → 400.
- `mail-test` and `insights.php` unauthenticated → 403; `health` unauthenticated → bare `{"ok":true}`.
- Login: 10 attempts per IP / 15 min, 8 per account / hour. Newsletter and community: 5/hour.
