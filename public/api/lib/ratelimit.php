<?php
/**
 * Sliding-window rate limiter. Uses APCu when available, otherwise small
 * lock-protected files in <private>/ratelimit/. Keys are IP hashes, never raw IPs.
 */
declare(strict_types=1);

function rate_limit(string $bucket, string $key, int $max, int $windowSeconds): bool
{
    $now = time();

    if (function_exists('apcu_enabled') && apcu_enabled()) {
        $k = "kyra:rl:$bucket:$key:" . intdiv($now, $windowSeconds);
        $n = apcu_inc($k, 1, $ok, $windowSeconds);
        if ($n === false) { apcu_add($k, 1, $windowSeconds); $n = 1; }
        return $n <= $max;
    }

    $dir = kyra_private_dir() . '/ratelimit/' . preg_replace('/[^a-z_]/', '', $bucket);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return true; // fail open, but log
    $file = $dir . '/' . substr(preg_replace('/[^a-f0-9]/', '', $key), 0, 64);

    $fh = @fopen($file, 'c+');
    if (!$fh) { app_log('warn', 'ratelimit file not writable'); return true; }
    try {
        flock($fh, LOCK_EX);
        $hits = json_decode((string) stream_get_contents($fh), true);
        $hits = is_array($hits) ? array_values(array_filter($hits, fn ($t) => is_int($t) && $t > $now - $windowSeconds)) : [];
        $allowed = count($hits) < $max;
        if ($allowed) $hits[] = $now;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($hits));
        fflush($fh);
        flock($fh, LOCK_UN);
    } finally {
        fclose($fh);
    }

    // Occasional clean-up of stale files (≈1 in 200 requests).
    if (random_int(1, 200) === 1) {
        foreach (glob($dir . '/*') ?: [] as $f) {
            if (@filemtime($f) < $now - 86400) @unlink($f);
        }
    }
    return $allowed;
}
