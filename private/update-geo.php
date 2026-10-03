<?php
/**
 * Weekly GeoLite2-City refresh. Run from a Hostinger cron job (hPanel → Advanced → Cron Jobs):
 *
 *   /usr/bin/php /home/<user>/domains/<domain>/private/update-geo.php
 *   schedule: 0 3 * * 3   (every Wednesday 03:00 — MaxMind publishes on Tuesdays)
 *
 * CLI only. Downloads with your MaxMind account ID + licence key, verifies the
 * SHA-256, extracts the .mmdb and swaps it in atomically.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$config = require __DIR__ . '/config.php';
$account = (string) ($config['MAXMIND_ACCOUNT_ID'] ?? '');
$key = (string) ($config['MAXMIND_LICENSE_KEY'] ?? '');
if ($account === '' || $key === '') { fwrite(STDERR, "MAXMIND_ACCOUNT_ID / MAXMIND_LICENSE_KEY missing in config.php\n"); exit(1); }

$geoDir = __DIR__ . '/geo';
$target = ($config['GEOIP_DB_PATH'] ?? '') ?: $geoDir . '/GeoLite2-City.mmdb';
@mkdir($geoDir, 0700, true);
$tmp = sys_get_temp_dir() . '/kyra-geo-' . bin2hex(random_bytes(4));
@mkdir($tmp, 0700, true);

function fetch_to(string $url, string $dest, string $auth): void
{
    $fh = fopen($dest, 'wb');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FILE => $fh,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERPWD => $auth,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_FAILONERROR => true,
    ]);
    $ok = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    fclose($fh);
    if (!$ok) throw new RuntimeException("Download failed: $url ($err)");
}

try {
    $base = 'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=';
    $auth = "$account:$key";
    fetch_to($base . 'tar.gz', "$tmp/db.tar.gz", $auth);
    fetch_to($base . 'tar.gz.sha256', "$tmp/db.sha256", $auth);

    $expected = strtolower(strtok(trim((string) file_get_contents("$tmp/db.sha256")), " \t"));
    if (!hash_equals($expected, hash_file('sha256', "$tmp/db.tar.gz"))) throw new RuntimeException('Checksum mismatch');

    (new PharData("$tmp/db.tar.gz"))->decompress(); // → db.tar
    $found = null;
    foreach (new RecursiveIteratorIterator(new PharData("$tmp/db.tar")) as $file) {
        if (str_ends_with($file->getFilename(), '.mmdb')) { $found = $file->getPathname(); break; }
    }
    if (!$found) throw new RuntimeException('No .mmdb in archive');

    $staging = $target . '.new';
    if (!copy($found, $staging) || filesize($staging) < 1_000_000) throw new RuntimeException('Extracted file looks wrong');
    chmod($staging, 0600);
    rename($staging, $target); // atomic swap on the same filesystem
    echo gmdate('c') . " GeoLite2-City updated (" . round(filesize($target) / 1048576, 1) . " MB)\n";
} catch (Throwable $e) {
    fwrite(STDERR, gmdate('c') . ' GeoLite2 update failed: ' . $e->getMessage() . "\n");
    exit(1);
} finally {
    foreach (glob("$tmp/*") ?: [] as $f) @unlink($f);
    @rmdir($tmp);
}
