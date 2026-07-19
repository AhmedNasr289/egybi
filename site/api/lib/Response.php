<?php
/**
 * Response — builds JSON envelopes; the front controller (index.php) is the
 * single place that actually emits output, so responses can be cached centrally.
 *
 * Controllers RETURN Response::ok(...) (a plain array) and call Response::error()
 * to abort with an HTTP error (thrown as ApiException, caught in index.php).
 * Nothing here calls exit(), which is what lets index.php buffer + cache cleanly.
 */

class ApiException extends Exception
{
    public int $statusCode;
    public function __construct(string $message, int $status = 400)
    {
        parent::__construct($message);
        $this->statusCode = $status;
    }
}

class Response
{
    public static function cors(array $config): void
    {
        header('Access-Control-Allow-Origin: ' . $config['cors_allow_origin']);
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /** Build a success envelope (no output). */
    public static function ok($data, array $meta = []): array
    {
        return array_merge(['ok' => true], $meta, ['data' => $data]);
    }

    /** Abort the request with an HTTP error, handled centrally in index.php. */
    public static function error(string $message, int $status = 400): void
    {
        throw new ApiException($message, $status);
    }

    /** The single output point. */
    public static function emit(array $payload, int $status = 200, string $cacheStatus = 'MISS'): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-EgyBI-Cache: ' . $cacheStatus);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }
}
