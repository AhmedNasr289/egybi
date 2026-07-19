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

    // --- SQLite (bundled read-only knowledge base) ---
    // The KB is static reference data, shipped as a committed SQLite file in the
    // non-web `backend/data/` folder (a sibling of `site/`, blocked from the web
    // by the root .htaccess). This is the default so the site works on Hostinger
    // with zero database setup; switch db_driver to 'mysql' above to scale later.
    'sqlite_path' => getenv('SQLITE_PATH') ?: __DIR__ . '/../../backend/data/egybi_kb.sqlite',

    // Response caching (data is static reference data — cache hard).
    // Kept inside api/ and blocked from the web by .htaccess.
    'cache_dir' => __DIR__ . '/cache',
    'cache_ttl' => (int)(getenv('CACHE_TTL') ?: 3600), // seconds

    // CORS: the client-side SQL sandbox on the site fetches dataset snapshots.
    // Lock this to the real origin in production; '*' is fine for public read-only data.
    'cors_allow_origin' => getenv('CORS_ORIGIN') ?: '*',
];
