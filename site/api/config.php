<?php
/**
 * EgyBI Knowledge-Base API — configuration.
 *
 * Reads settings from environment variables where available (recommended on
 * Hostinger — set them in the hPanel or a .env loader), falling back to sane
 * local-testing defaults (a SQLite file) so the API runs out of the box in dev.
 *
 * On Hostinger (production): set DB_DRIVER=mysql and the DB_* MySQL credentials.
 * Locally (testing): the defaults below use the SQLite DB built from
 * ../sql/schema_sqlite.sql + seed.sql, so no MySQL is needed to test the code.
 */

return [
    // 'mysql' for Hostinger production, 'sqlite' for local testing.
    'db_driver' => getenv('DB_DRIVER') ?: 'sqlite',

    // --- MySQL (Hostinger) ---
    'db_host'    => getenv('DB_HOST') ?: 'localhost',
    'db_port'    => getenv('DB_PORT') ?: '3306',
    'db_name'    => getenv('DB_NAME') ?: 'egybi_kb',
    'db_user'    => getenv('DB_USER') ?: 'egybi_user',
    'db_pass'    => getenv('DB_PASS') ?: '',
    'db_charset' => 'utf8mb4',

    // --- SQLite (local testing) ---
    // The web root is this `site/` folder; the test DB lives in the non-web
    // `backend/test/` tooling folder (a sibling of `site/` in the repo).
    'sqlite_path' => getenv('SQLITE_PATH') ?: __DIR__ . '/../../backend/test/egybi_test.sqlite',

    // Response caching (data is static reference data — cache hard).
    // Kept inside api/ and blocked from the web by .htaccess.
    'cache_dir' => __DIR__ . '/cache',
    'cache_ttl' => (int)(getenv('CACHE_TTL') ?: 3600), // seconds

    // CORS: the client-side SQL sandbox on the site fetches dataset snapshots.
    // Lock this to the real origin in production; '*' is fine for public read-only data.
    'cors_allow_origin' => getenv('CORS_ORIGIN') ?: '*',
];
