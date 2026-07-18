<?php
/**
 * Database — a tiny PDO wrapper (singleton).
 *
 * Supports MySQL (Hostinger production) and SQLite (local testing) from the same
 * code path, chosen by config['db_driver']. All queries use portable SQL so the
 * driver switch is transparent to the controllers.
 *
 * Read-only API: only SELECTs are ever issued, and table/dataset names are
 * validated against a whitelist in the controllers before use — never
 * interpolated from raw user input.
 */
class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(array $config): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        if ($config['db_driver'] === 'sqlite') {
            $dsn = 'sqlite:' . $config['sqlite_path'];
            self::$pdo = new PDO($dsn, null, null, $options);
            self::$pdo->exec('PRAGMA foreign_keys = ON;');
        } else {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                $config['db_host'],
                $config['db_port'],
                $config['db_name'],
                $config['db_charset']
            );
            self::$pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], $options);
        }

        return self::$pdo;
    }

    /** Run a parameterised SELECT and return all rows. */
    public static function query(array $config, string $sql, array $params = []): array
    {
        $stmt = self::pdo($config)->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
