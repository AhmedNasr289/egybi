<?php
/**
 * Cache — a minimal file cache for read-only reference data.
 *
 * The knowledge base is static, so responses can be cached hard. This degrades
 * gracefully: if the cache dir is missing or unwritable, it simply behaves as a
 * pass-through (never fatal), which is important on locked-down shared hosting.
 */
class Cache
{
    private string $dir;
    private int $ttl;
    private bool $enabled;

    public function __construct(string $dir, int $ttl)
    {
        $this->dir = rtrim($dir, '/\\');
        $this->ttl = $ttl;
        if (!is_dir($this->dir)) {
            @mkdir($this->dir, 0755, true);
        }
        $this->enabled = is_dir($this->dir) && is_writable($this->dir);
    }

    private function path(string $key): string
    {
        return $this->dir . '/' . preg_replace('/[^a-z0-9_\-]/i', '_', $key) . '.json';
    }

    /** Return cached payload (as an array) or null on miss/expiry/disabled. */
    public function get(string $key): ?array
    {
        if (!$this->enabled) {
            return null;
        }
        $file = $this->path($key);
        if (!is_file($file) || (time() - filemtime($file)) > $this->ttl) {
            return null;
        }
        $raw = file_get_contents($file);
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    public function set(string $key, array $data): void
    {
        if (!$this->enabled) {
            return;
        }
        @file_put_contents($this->path($key), json_encode($data), LOCK_EX);
    }
}
