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
1. **`backend/sql/schema_mysql.sql`** — the 61 KB tables. Then the seeds in order:
   `seed.sql`, `seed_v2.sql` … through `seed_v9.sql` (don't stop at v8 — `seed_v9`
   fills the obelisks/temples/discoveries/royal-women tables the homepage reads).
2. **`site/auth/schema_auth_mysql.sql`** — the accounts tables. ⚠️ Import the
   **`_mysql`** one, *not* `schema_auth.sql` (that one is SQLite-only and will
   fail on MySQL).

## Step 4 — Configuration (one file ABOVE `public_html`)

> ### ⚠ Corrected twice. Read this once and you are done.
> **First mistake:** this guide used to say to create `_private/config.php` and
> that a redeploy would "not touch it". False — `_private/` is gitignored, so it
> is absent from the repo, and Hostinger's deploy replaces `public_html` from the
> repo. **Every push deleted it**, taking the accounts DB, the Papyrus subscriber
> list, the community notes and the analytics data with it. Silently.
>
> **Second mistake:** the fix said to use hPanel environment variables. Hostinger
> **shared hosting has no environment-variable section** — *Advanced → PHP
> Configuration* offers only *PHP version / PHP extensions / PHP options*.
>
> **What actually works:** a config file in the folder *above* `public_html`.
> Deploys only replace `public_html`, so anything above it survives untouched.

**Steps (about two minutes):**

0. **Ask the server where to put it.** Open
   `https://egybi.com/auth/auth.php?action=health` and read **`put_config_here`**
   — it prints the exact absolute path, and `deployed_folder` shows the folder
   that gets wiped. The single most common mistake is creating the file *inside*
   `public_html`; it must sit in the folder that **contains** `public_html`.

1. hPanel → **Files → File Manager**.
2. Navigate so you can *see* the `public_html` folder — you want the folder that
   contains it, e.g. `/domains/egybi.com/`. **Do not go inside `public_html`.**
3. **New File** → name it exactly **`egybi-config.php`**.
4. Open it and paste the contents of **`egybi-config.sample.php`** (in the repo
   root), then fill in your values:
   - **MySQL** (recommended): create a DB in *Databases → MySQL Databases* and
     paste the name / user / password. The tables build themselves on the first
     request — no phpMyAdmin import needed.
   - **or SQLite** (simpler, no DB to create): comment out the five MySQL lines
     and set `sqlite_path` to a folder above `public_html`.
   - Paste a long random string into `app_secret`, and another into
     `analytics_key` (that one becomes your permanent `/api/insights.php?key=`).
5. Save.

**Confirm it worked** — open:
`https://egybi.com/auth/auth.php?action=health`

You want:
```
"durable": true
"config":  "durable — egybi-config.php above the deployed folder"
```
If `durable` is still `false`, the file is in the wrong place — it is almost
always one level too deep, i.e. inside `public_html`.

*(If you ever move to a VPS or another host that does expose environment
variables, `lib.php` still reads `AUTH_DB_*`, `APP_SECRET`, `ANALYTICS_KEY`,
`SMTP_*` and `GOOGLE_CLIENT_ID` from the environment as well.)*

## Step 5 — Email (verify + password-reset mail)
You built the `hello@egybi.com` mailbox already. In the same
`egybi-config.php` from Step 4:
```php
'smtp_host'  => 'smtp.hostinger.com',
'smtp_port'  => 465,                 // or 587 if 465 is blocked
'smtp_user'  => 'hello@egybi.com',
'smtp_pass'  => 'YOUR MAILBOX PASSWORD',
'mail_from'  => 'no-reply@egybi.com',
```
Then hPanel → **Emails → egybi.com → … → Aliases**: add **`no-reply@egybi.com`**
as a **free alias** on the `hello@` mailbox (the plan allows 5 aliases).
Leave the `smtp_*` values blank and links are logged instead of sent — fine
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
- Add `'require_verified' => '1'` to `egybi-config.php` to require a verified
  email before login (off by default so launch is frictionless).
- Set up a Hostinger **cron** for light housekeeping if you like — the app
  already prunes expired sessions and old rate-limit rows on each login, so this
  is optional, not required.

---

## Everyday workflow after go-live
Edit code locally → `git push` → Hostinger auto-pulls (if you enabled the
webhook in Step 1) or click **Deploy**. **Anything above `public_html`
survives a deploy; anything inside it that is not in the repo does NOT.** That is
why `egybi-config.php` and all four data stores now live outside it (Step 4). Payments stay **off** until you deliberately
enable them (see `backend/DEPLOY.md` Step 11).

## If something's wrong
- **Site loads at `/site/` not the root, or vault is reachable** → Step 2 (doc
  root) isn't set to `public_html/site`.
- **500 on `/api/…` or `/auth/…`** → check the DB creds in the two config files;
  confirm you imported `schema_auth_mysql.sql` (not the SQLite one).
- **No verify email** → `smtp_*` not filled, or deliverability (Step 6); check
  `site/auth/_private/mail.log` for a logged link as a fallback (note that this
  log is itself erased by the next deploy).
