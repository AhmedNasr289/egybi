<?php
/**
 * EgyBI — auth config SAMPLE.  ***THIS FILE IS SAFE (no secrets).***
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ⚠  DO NOT USE _private/config.php ON HOSTINGER. IT WILL BE DELETED.       │
 * │                                                                          │
 * │ Hostinger's git deployment replaces public_html with the repository       │
 * │ contents. `_private/` is gitignored, so it is NOT in the repository, so   │
 * │ every single `git push` deletes it — config, database, subscriber list    │
 * │ and all. Nothing errors; the data just silently ceases to exist.          │
 * │                                                                          │
 * │ USE hPANEL ENVIRONMENT VARIABLES INSTEAD. They survive deployments and    │
 * │ never enter the repository. Names are in the right-hand column below and  │
 * │ the full walkthrough is in backend/DEPLOY.md.                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * This file still works for LOCAL development, where nothing is deploying over
 * the top of it. Every value has a safe default in code, so set only what you use.
 *
 *   config key          env var (use these in production)
 *   ------------------  ---------------------------------
 *   driver              AUTH_DB_DRIVER      ('mysql')
 *   host                AUTH_DB_HOST
 *   name                AUTH_DB_NAME
 *   user                AUTH_DB_USER
 *   pass                AUTH_DB_PASS
 *   app_secret          APP_SECRET
 *   app_url             APP_URL
 *   smtp_host/user/pass SMTP_HOST / SMTP_USER / SMTP_PASS
 *   google_client_id    GOOGLE_CLIENT_ID
 *   (analytics key)     ANALYTICS_KEY
 */
return [
    // --- Database (use your Hostinger MySQL details from hPanel > Databases) ---
    'driver' => 'mysql',                 // 'mysql' on Hostinger, 'sqlite' for local testing
    'host'   => 'localhost',             // Hostinger MySQL host is usually 'localhost'
    'name'   => 'uXXXXXXXX_egybi_auth',  // the database you created (import schema_auth_mysql.sql into it)
    'user'   => 'uXXXXXXXX_egybi',       // the DB username
    'pass'   => 'YOUR_DB_PASSWORD',      // the DB password

    // --- App ---
    'app_secret'    => 'PUT_A_LONG_RANDOM_STRING_HERE', // any long random text; used to hash IPs
    'secure_cookie' => '1',              // '1' on HTTPS (always, in production)
    'app_url'       => 'https://egybi.com',

    // --- Email (Hostinger SMTP) — fill these to actually SEND verify/reset mails.
    //     Leave blank to keep them logged instead of sent (fine before launch). ---
    'smtp_host'      => 'smtp.hostinger.com',
    'smtp_port'      => 465,             // 465 = SSL (recommended). Use 587 for STARTTLS.
    'smtp_user'      => 'hello@egybi.com',        // your mailbox
    'smtp_pass'      => 'YOUR_MAILBOX_PASSWORD',  // the hello@egybi.com password
    'mail_from'      => 'no-reply@egybi.com',     // an ALIAS on hello@ (recommended)
    'mail_from_name' => 'EgyBI',

    // --- Google Sign-In ("Continue with Google") ---
    // Leave EMPTY to keep the whole Google path switched off: no button renders
    // and google.php refuses every request. Fill it in to turn the feature on.
    //
    // Get this from Google Cloud Console > APIs & Services > Credentials >
    // Create credentials > OAuth client ID > Web application:
    //   Authorised JavaScript origins:  https://egybi.com
    //                                   https://www.egybi.com
    //   Authorised redirect URIs:       (none needed — the GIS ID-token flow
    //                                    posts the credential to our own page,
    //                                    it does not redirect through Google)
    // The client ID is PUBLIC (it ships in the page). There is deliberately no
    // client SECRET here: the ID-token flow does not use one, so there is no
    // secret to leak.
    'google_client_id' => '',   // e.g. '1234567890-abc123.apps.googleusercontent.com'
];
