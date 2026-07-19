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

## Step 2 — Set the website's document root to the `site/` folder  ← the key step
By default Hostinger serves `public_html`. You must point the domain at
`public_html/site` so (a) the site loads at the root and (b) your `backend/`
tooling and private `egybi/` vault are **not** reachable on the web.

hPanel → **Websites → egybi.com → Dashboard**, then either:
- **Website settings → Change website's root directory** (some plans call it
  "Document root"), set it to **`public_html/site`**, save; **or**
- if you don't see that option, tell Hostinger support "set my document root to
  `public_html/site`" — it's a one-line change they do instantly.

**Verify:** visit `https://egybi.com/` → the homepage loads. Visit
`https://egybi.com/egybi/` and `https://egybi.com/backend/` → both should **404**
(proof your vault and source are not exposed).

## Step 3 — Create the databases (phpMyAdmin)
hPanel → **Databases → MySQL Databases**. Create one DB + user (or two — one for
the knowledge base, one for auth; reusing a single DB is fine).
Then hPanel → **phpMyAdmin** → select the DB → **Import**:
1. **`backend/sql/schema_mysql.sql`** — the 58 KB tables. Then the seeds in order:
   `seed.sql`, `seed_v2.sql` … through `seed_v8.sql`.
2. **`site/auth/schema_auth_mysql.sql`** — the accounts tables. ⚠️ Import the
   **`_mysql`** one, *not* `schema_auth.sql` (that one is SQLite-only and will
   fail on MySQL).

## Step 4 — Configuration files (secrets never go in Git)
Two config files. Both read env-vars/defaults, but the easy path is a file.

**A) Knowledge-base API** — `public_html/site/api/config.php` is already deployed
as a safe template. In File Manager, edit it and set `db_driver => 'mysql'` and
the Step-3 KB DB `db_host` / `db_name` / `db_user` / `db_pass`.

**B) Accounts/auth** — in File Manager, inside `public_html/site/auth/`:
1. Create a folder **`_private`**.
2. Copy **`config.sample.php`** into it as **`config.php`**.
3. Edit `_private/config.php` and fill in:
   - the Step-3 auth DB `host` / `name` / `user` / `pass`
   - `app_secret` → a long random string
   - `app_url` → `https://egybi.com`, `secure_cookie => '1'`
   - SMTP (Step 5)

`_private/` is git-ignored, so it's never committed, and Step 2 + the folder's
`.htaccess` keep it off the web. A `git push`/redeploy will **not** touch it.

## Step 5 — Email (verify + password-reset mail)
You built the `hello@egybi.com` mailbox already. In `_private/config.php`:
```
'smtp_host'  => 'smtp.hostinger.com',
'smtp_port'  => 465,                 // or 587 if 465 is blocked
'smtp_user'  => 'hello@egybi.com',
'smtp_pass'  => 'YOUR MAILBOX PASSWORD',
'mail_from'  => 'no-reply@egybi.com',
```
Then hPanel → **Emails → egybi.com → … → Aliases**: add **`no-reply@egybi.com`**
as a **free alias** on the `hello@` mailbox (the plan allows 5 aliases).
Leave the `smtp_*` values blank and links are logged to `_private/mail.log`
instead of sent — fine before launch; signup/reset still succeed.

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
- In `_private/config.php` add `'require_verified' => '1'` to require a verified
  email before login (off by default so launch is frictionless).
- Set up a Hostinger **cron** for light housekeeping if you like — the app
  already prunes expired sessions and old rate-limit rows on each login, so this
  is optional, not required.

---

## Everyday workflow after go-live
Edit code locally → `git push` → Hostinger auto-pulls (if you enabled the
webhook in Step 1) or click **Deploy**. Your `_private/config.php` and the live
databases are untouched by deploys. Payments stay **off** until you deliberately
enable them (see `backend/DEPLOY.md` Step 11).

## If something's wrong
- **Site loads at `/site/` not the root, or vault is reachable** → Step 2 (doc
  root) isn't set to `public_html/site`.
- **500 on `/api/…` or `/auth/…`** → check the DB creds in the two config files;
  confirm you imported `schema_auth_mysql.sql` (not the SQLite one).
- **No verify email** → `smtp_*` not filled, or deliverability (Step 6); check
  `site/auth/_private/mail.log` for a logged link as a fallback.
