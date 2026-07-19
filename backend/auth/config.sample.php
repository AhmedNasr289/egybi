<?php
/**
 * EgyBI — auth config SAMPLE.  ***THIS FILE IS SAFE (no secrets).***
 *
 * TO GO LIVE ON HOSTINGER:
 *   1. Copy this file to  backend/auth/_private/config.php
 *      (in Hostinger File Manager: create the _private folder inside auth/,
 *       then upload/paste this as config.php and fill in your real values).
 *   2. The _private folder is never web-accessible and is git-ignored, so your
 *      passwords never get committed or served.
 *   3. That's it — no hPanel "environment variables" needed.
 *
 * Every value has a safe default in code, so you only need to set what you use.
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
];
