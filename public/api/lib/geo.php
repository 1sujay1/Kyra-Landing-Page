<?php
/**
 * Approximate (city-level) IP geolocation.
 *  Primary:  MaxMind GeoLite2-City .mmdb, read locally — no data leaves the server.
 *  Fallback: ipinfo.io (token server-side), 1 s timeout, cached 24 h per IP hash.
 * Never blocks: on any failure returns an empty array and the event is saved without location.
 */
declare(strict_types=1);

/** @return array{country?:string, region?:string, city?:string, latitude?:float, longitude?:float} */
function geo_lookup(string $ip, string $ipHash): array
{
    // Private / reserved addresses (local testing) have no location.
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return [];

    $cacheDir = kyra_private_dir() . '/cache/geo';
    $cacheFile = $cacheDir . '/' . substr($ipHash, 0, 64) . '.json';
    if (is_file($cacheFile) && filemtime($cacheFile) > time() - 86400) {
        $c = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($c)) return $c;
    }

    $geo = geo_from_mmdb($ip);
    if ($geo === null) $geo = geo_from_ipinfo($ip);
    $geo ??= [];

    if (!is_dir($cacheDir)) @mkdir($cacheDir, 0700, true);
    @file_put_contents($cacheFile, json_encode($geo), LOCK_EX);
    if (random_int(1, 500) === 1) {
        foreach (glob($cacheDir . '/*.json') ?: [] as $f) if (@filemtime($f) < time() - 86400) @unlink($f);
    }
    return $geo;
}

function geo_load_reader_classes(): bool
{
    if (class_exists('MaxMind\\Db\\Reader')) return true;
    $priv = kyra_private_dir();
    // Option A: Composer (`composer require geoip2/geoip2` inside the private dir)
    if (is_file($priv . '/vendor/autoload.php')) {
        require_once $priv . '/vendor/autoload.php';
        if (class_exists('MaxMind\\Db\\Reader')) return true;
    }
    // Option B: no Composer — copy maxmind-db/reader's src/MaxMind folder to <private>/maxmind-db/MaxMind
    $base = $priv . '/maxmind-db/';
    if (is_file($base . 'MaxMind/Db/Reader.php')) {
        spl_autoload_register(static function (string $class) use ($base): void {
            if (str_starts_with($class, 'MaxMind\\Db\\')) {
                $f = $base . str_replace('\\', '/', $class) . '.php';
                if (is_file($f)) require_once $f;
            }
        });
        return class_exists('MaxMind\\Db\\Reader');
    }
    return false;
}

function geo_from_mmdb(string $ip): ?array
{
    $db = (string) cfg('GEOIP_DB_PATH', kyra_private_dir() . '/geo/GeoLite2-City.mmdb');
    if (!is_file($db) || !geo_load_reader_classes()) return null;
    try {
        $reader = new MaxMind\Db\Reader($db);
        $r = $reader->get($ip);
        $reader->close();
    } catch (Throwable $e) {
        app_log('warn', 'mmdb lookup failed', ['error' => $e->getMessage()]);
        return null;
    }
    if (!is_array($r)) return [];
    return array_filter([
        'country' => $r['country']['iso_code'] ?? null,
        'region' => $r['subdivisions'][0]['names']['en'] ?? null,
        'city' => $r['city']['names']['en'] ?? null,
        'latitude' => isset($r['location']['latitude']) ? round((float) $r['location']['latitude'], 2) : null,
        'longitude' => isset($r['location']['longitude']) ? round((float) $r['location']['longitude'], 2) : null,
    ], fn ($v) => $v !== null);
}

function geo_from_ipinfo(string $ip): ?array
{
    $token = (string) cfg('IPINFO_TOKEN', '');
    if ($token === '') return null;
    // Note: the free "Lite" plan returns country only; city/region need a paid or legacy plan.
    $ch = curl_init('https://ipinfo.io/' . rawurlencode($ip) . '/json');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT_MS => 700,
        CURLOPT_TIMEOUT_MS => 1000,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    $ok = curl_getinfo($ch, CURLINFO_RESPONSE_CODE) === 200;
    curl_close($ch);
    if (!$ok || !is_string($raw)) return null;
    $r = json_decode($raw, true);
    if (!is_array($r)) return null;
    [$lat, $lng] = array_pad(explode(',', (string) ($r['loc'] ?? '')), 2, null);
    return array_filter([
        'country' => $r['country'] ?? ($r['country_code'] ?? null),
        'region' => $r['region'] ?? null,
        'city' => $r['city'] ?? null,
        'latitude' => is_numeric($lat) ? round((float) $lat, 2) : null,
        'longitude' => is_numeric($lng) ? round((float) $lng, 2) : null,
    ], fn ($v) => $v !== null && $v !== '');
}
