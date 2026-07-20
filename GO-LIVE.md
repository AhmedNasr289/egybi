# EgyBI — Go-Live Checklist (Git auto-deploy on Hostinger)

This is the one document to follow to take egybi.com live. It assumes you've
already connected Hostinger to your GitHub repo (done ✅). Work top to bottom;
each step says exactly where to click.

> **Repo layout (important).** The whole website — pages **and** the `api/` and
> `auth/` backends — lives in one folder: **`site/`**. That folder is your
> **document root**. Everything else in the repo (`backend/` tooling, the
> `egybi/` docs vault, `README.md`) sits *outside* `site/` and must **never** be
> web-served. Step 2 is what makes that happen.

---

## Step 1 — Point Hostinger's Git deploy at your repo
hPanel → **Advanced → GIT**:
1. Repository: your `egybi` repo. Branch: `main`.
2. Install path: **`public_html`** (the default).
3. Save. Hit **Deploy** (or enable **Auto-deployment** so every `git push` pulls
   automatically — copy the webhook URL into GitHub → repo **Settings → Webhooks**).

After deploy, your files live at `public_html/site/…`, `public_html/backend/…`,
`public_html/egybi/…`. That's expected — Step 2 fixes what the browser sees.

## Step 2 — Serving the `site/` folder (handled automatically)
No document-root change needed. A committed **`.htaccess` at the repo root**
(deployed to `public_html/.htaccess`) makes Apache serve the `site/` subfolder as
the web root and **hard-blocks** the `egybi/` vault and `backend/` tooling. So a
plain Git deploy to `public_html` "just works."

**Verify after deploy:** visit `https://egybi.com/` → the homepage loads. Visit
`https://egybi.com/egybi/` and `https://egybi.com/backend/` → both should be
**403/404** (proof your vault and source are not exposed).

## Step 3 — Create the databases (phpMyAdmin)
hPanel → **Databases → MySQL Databases**. Create one DB + user (or two — one for
the knowledge base, one for auth; reusing a single DB is fine).
Then hPanel → **phpMyAdmin** → select the DB → **Import**:
1. **`backend/sql/schema_mysql.sql`** — the 58 KB tables. Then the seeds in order:
   `seed.sql`, `seed_v2.sql` … through `seed_v8.sql`.
2. **`site/auth/schema_auth_mysql.sql`** — the accounts tables. ⚠️ Import the
   **`_mysql`** one, *not* `schema_auth.sql` (that one is SQLite-only and will
   fail on MySQL).

## Step 4 — Configuration (hPanel environment variables — NOT a config file)

> ### ⚠ Corrected 2026-07-20 — this step used to be wrong
> An earlier version of this guide said to create `_private/config.php` and that
> a redeploy would **not** touch it. **That was false, and it cost data.**
> Hostinger's git deploy replaces `public_html` with the repository contents, and
> `_private/` is gitignored — so it is not in the repo, and **every `git push`
> deleted it**: the accounts database, the Papyrus subscriber list, the community
> notes, and the analytics database along with its access key. Nothing ever
> errored; the app quietly rebuilt an empty database each time.
>
> Proven by deploying a one-line change to `robots.txt` and watching the SQLite
> file's creation time jump, with zero users in the new one.
>
> **Environment variables survive deploys. Use them.**

**A) Knowledge-base API** — `public_html/site/api/config.php` is a tracked file
(it ships in the repo, so a deploy restores it rather than deleting it). Editing
it in File Manager works, but the edit is overwritten on the next deploy — so set
the KB DB via env vars too, or commit the change.

**B) Accounts, newsletter, community, analytics** — all four now share one
database. In hPanel → **Advanced → PHP Configuration → Environment Variables**:

| Variable | Value |
|---|---|
| `AUTH_DB_DRIVER` | `mysql` |
| `AUTH_DB_HOST` | `localhost` |
| `AUTH_DB_NAME` | your Step-3 auth database |
| `AUTH_DB_USER` / `AUTH_DB_PASS` | its user and password |
| `APP_SECRET` | a long random string |
| `APP_URL` | `https://egybi.com` |
| `AUTH_SECURE_COOKIE` | `1` |
| `ANALYTICS_KEY` | a long random string — this becomes the permanent `?key=` for the insights dashboard |
| `GOOGLE_CLIENT_ID` | your OAuth client ID (omit to keep Google sign-in off) |

**The tables build themselves** on the first request — the phpMyAdmin import in
Step 3 is now optional.

**Confirm it took effect:** open
`https://egybi.com/auth/auth.php?action=health` and check for
`"durable": true`. If it says `false`, the env vars are not being read and your
data is still being destroyed on every push.

## Step 5 — Email (verify + password-reset mail)
You built the `hello@egybi.com` mailbox already. Add these environment variables
alongside the ones above:
```
SMTP_HOST  = smtp.hostinger.com
SMTP_PORT  = 465                    # or 587 if 465 is blocked
SMTP_USER  = hello@egybi.com
SMTP_PASS  = YOUR MAILBOX PASSWORD
MAIL_FROM  = no-reply@egybi.com
```
Then hPanel → **Emails → egybi.com → … → Aliases**: add **`no-reply@egybi.com`**
as a **free alias** on the `hello@` mailbox (the plan allows 5 aliases).
Leave the `SMTP_*` values unset and links are logged instead of sent — fine
before launch; signup/reset still succeed.

## Step 6 — Email deliverability (so verify mail doesn't hit spam)
A brand-new domain's mail often lands in Junk. hPanel → **Emails → egybi.com →
DNS / Configuration** and confirm these DNS records exist (Hostinger usually
auto-creates SPF + DKIM for its mailboxes):
- **SPF** — a `TXT` record like `v=spf1 include:_spf.mail.hostinger.com ~all`.
- **DKIM** — a `TXT`/`CNAME` record Hostinger provides; make sure it's enabled.
- **DMARC** — add a `TXT` record at `_dmarc.egybi.com`:
  `v=DMARC1; p=none; rua=mailto:hello@egybi.com` (start with `p=none`).

**Verify:** after Step 7's signup test, check the verification email arrives in a
Gmail **inbox**, not spam. (Optional: send a test to `check-auth@verifier.port25.com`
or use mail-tester.com for an SPF/DKIM/DMARC score.)

## Step 7 — Prove it end-to-end on the live site
On `https://egybi.com`:
1. **Sign in → Create account** with your own email.
2. Receive the **verify email** → click the link → it returns to the site
   confirming "Email verified."
3. **Sign in.** Solve a challenge on **Practice** → your **XP / streak / rank**
   appear in the account menu and the profile strip.
4. Account menu → **✎** next to your handle → rename → confirm it sticks and
   shows on the Practice leaderboard.
5. Sign out, use **Forgot password?**, receive the reset email, set a new
   password, sign in with it.

If every box is checked, you're live. 🎉

## Step 8 — (optional) once deliverability is proven
- Set the env var `AUTH_REQUIRE_VERIFIED=1` to require a verified email before
  login (off by default so launch is frictionless).
- Set up a Hostinger **cron** for light housekeeping if you like — the app
  already prunes expired sessions and old rate-limit rows on each login, so this
  is optional, not required.

---

## Everyday workflow after go-live
Edit code locally → `git push` → Hostinger auto-pulls (if you enabled the
webhook in Step 1) or click **Deploy**. **MySQL data and hPanel environment
variables survive deploys; anything written into a `_private/` folder inside
`public_html` does NOT — it is deleted on every push.** That is why config and
all four data stores now live outside that folder (Step 4). Payments stay **off** until you deliberately
enable them (see `backend/DEPLOY.md` Step 11).

## If something's wrong
- **Site loads at `/site/` not the root, or vault is reachable** → Step 2 (doc
  root) isn't set to `public_html/site`.
- **500 on `/api/…` or `/auth/…`** → check the DB creds in the two config files;
  confirm you imported `schema_auth_mysql.sql` (not the SQLite one).
- **No verify email** → `smtp_*` not filled, or deliverability (Step 6); check
  `site/auth/_private/mail.log` for a logged link as a fallback (note that this
  log is itself erased by the next deploy).
