<?php
/**
 * EgyBI — durable config TEMPLATE.  ***THIS FILE IS SAFE (no real secrets).***
 *
 * ─── WHERE THIS GOES ────────────────────────────────────────────────────────
 * Copy it into the folder that CONTAINS `public_html`, and name it exactly:
 *
 *     egybi-config.php
 *
 * e.g.  /home/u123456789/domains/egybi.com/egybi-config.php
 *       /home/u123456789/domains/egybi.com/public_html/   <- the deployed site
 *
 * ─── WHY THERE, AND NOT INSIDE THE SITE ─────────────────────────────────────
 * Hostinger's git deployment REPLACES `public_html` with the repository
 * contents. Anything inside it that is not in the repo — like a gitignored
 * `_private/config.php` — is deleted on every single push. That silently
 * destroyed the accounts database, the newsletter list, the community notes and
 * the analytics data, over and over, with nothing in the logs.
 *
 * Deploys never touch the folder ABOVE `public_html`. A config here survives
 * every push. `lib.php` walks upward looking for this exact filename.
 *
 * (Hostinger shared hosting has no hPanel environment-variable section — the
 * PHP Configuration page offers only version / extensions / options — so this
 * file is the reliable way to hold settings on that plan.)
 *
 * ─── CHECK IT WORKED ────────────────────────────────────────────────────────
 * Open  https://egybi.com/auth/auth.php?action=health
 * You want:  "durable": true   and   "config": "durable — egybi-config.php ..."
 */
return [

    // ── OPTION A (recommended): MySQL ──────────────────────────────────────
    // Create the database in hPanel > Databases > MySQL Databases, then paste
    // the three values here. The tables build themselves on the first request —
    // no phpMyAdmin import needed.
    'driver' => 'mysql',
    'host'   => 'localhost',
    'name'   => 'uXXXXXXXXX_egybi_auth',   // <- your database name
    'user'   => 'uXXXXXXXXX_egybi',        // <- your database user
    'pass'   => 'YOUR_DB_PASSWORD',        // <- your database password

    // ── OPTION B (simpler): SQLite in a folder above public_html ───────────
    // Delete the five 'driver'/'host'/'name'/'user'/'pass' lines above and use
    // these two instead. No database to create; fine at low traffic.
    // 'driver'      => 'sqlite',
    // 'sqlite_path' => '/home/uXXXXXXXXX/domains/egybi.com/egybi-data/auth.sqlite',

    // ── App ────────────────────────────────────────────────────────────────
    'app_secret'    => 'PASTE_A_LONG_RANDOM_STRING_HERE',  // used to hash IPs
    'app_url'       => 'https://egybi.com',
    'secure_cookie' => '1',                                 // always '1' on HTTPS

    // ── Analytics ──────────────────────────────────────────────────────────
    // This becomes the permanent ?key= for /api/insights.php. It used to be
    // regenerated on every deploy, which kept breaking the bookmarked URL.
    'analytics_key' => 'PASTE_ANOTHER_LONG_RANDOM_STRING_HERE',

    // ── Email (verify + password-reset). Leave blank to log links instead. ──
    'smtp_host'      => 'smtp.hostinger.com',
    'smtp_port'      => 465,                        // 587 if 465 is blocked
    'smtp_user'      => 'hello@egybi.com',
    'smtp_pass'      => 'YOUR_MAILBOX_PASSWORD',
    'mail_from'      => 'no-reply@egybi.com',       // free alias on hello@
    'mail_from_name' => 'EgyBI',

    // ── Google Sign-In. Empty = the button never renders. ──────────────────
    'google_client_id' => '',   // e.g. '1234-abc.apps.googleusercontent.com'
];
