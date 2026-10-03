<?php
/**
 * Shared bootstrap for every API endpoint: config, errors, JSON I/O, origin
 * check, client IP and IP hashing. Never echo secrets or raw errors.
 */
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

/**
 * Finds the private directory that holds config.php. Checked in order:
 *  1. KYRA_PRIVATE_DIR environment variable (if your host lets you set one)
 *  2. <parent of public_html>/private   e.g. /home/u123/domains/example.com/private
 *  3. <home>/private                     e.g. /home/u123/private
 *  4. public_html/api/_private           fallback, protected by .htaccess (must return 403)
 */
function kyra_private_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;
    $publicHtml = dirname(__DIR__, 2);
    $candidates = array_filter([
        getenv('KYRA_PRIVATE_DIR') ?: null,
        dirname($publicHtml) . '/private',
        (getenv('HOME') ?: '') !== '' ? getenv('HOME') . '/private' : null,
        dirname(__DIR__) . '/_private',
    ]);
    foreach ($candidates as $c) {
        if (is_file($c . '/config.php')) return $dir = rtrim($c, '/');
    }
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    error_log('[kyra] config.php not found in any private directory candidate');
    echo '{"ok":false,"error":"Service temporarily unavailable."}';
    exit;
}

$GLOBALS['KYRA_CONFIG'] = require kyra_private_dir() . '/config.php';

$logDir = kyra_private_dir() . '/logs';
if (!is_dir($logDir)) @mkdir($logDir, 0700, true);
ini_set('error_log', $logDir . '/php-error.log');

function cfg(string $key, mixed $default = null): mixed
{
    $v = $GLOBALS['KYRA_CONFIG'][$key] ?? null;
    return ($v === null || $v === '') ? $default : $v;
}

/** Application log (never includes raw phone numbers or secrets). */
function app_log(string $level, string $msg, array $ctx = []): void
{
    $line = sprintf("%s [%s] %s %s\n", gmdate('c'), $level, $msg, $ctx ? json_encode($ctx, JSON_UNESCAPED_SLASHES) : '');
    @file_put_contents(kyra_private_dir() . '/logs/app.log', $line, FILE_APPEND | LOCK_EX);
}

function mask_phone(string $p): string
{
    return strlen($p) >= 4 ? substr($p, 0, 2) . str_repeat('x', max(0, strlen($p) - 4)) . substr($p, -2) : 'xx';
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function send_common_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Vary: Origin');
    $allowed = allowed_origins();
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: POST');
        header('Access-Control-Allow-Headers: Content-Type');
    }
}

function json_out(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Send the response now and keep running (notifications, CAPI) after the client has it. */
function respond_and_continue(int $status, ?array $body = null): void
{
    ignore_user_abort(true);
    http_response_code($status);
    $out = $body === null ? '' : json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    header('Content-Length: ' . strlen($out));
    header('Connection: close');
    echo $out;
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } elseif (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        while (ob_get_level() > 0) ob_end_flush();
        flush();
    }
}

function allowed_origins(): array
{
    $base = rtrim((string) cfg('ALLOWED_ORIGIN', ''), '/');
    $list = array_filter(array_merge([$base], (array) cfg('EXTRA_ALLOWED_ORIGINS', [])));
    // Accept both www and non-www variants of the main origin.
    if ($base !== '') {
        $host = parse_url($base, PHP_URL_HOST) ?: '';
        $alt = str_starts_with($host, 'www.') ? substr($host, 4) : 'www.' . $host;
        $list[] = str_replace('://' . $host, '://' . $alt, $base);
    }
    return array_values(array_unique($list));
}

/** Rejects non-POST and cross-site requests. Handles CORS preflight. */
function guard_request(): void
{
    send_common_headers();
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'OPTIONS') { http_response_code(204); exit; }
    if ($method !== 'POST') { header('Allow: POST'); json_out(405, ['ok' => false, 'error' => 'Method not allowed.']); }

    $allowed = allowed_origins();
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '' && !empty($_SERVER['HTTP_REFERER'])) {
        $p = parse_url($_SERVER['HTTP_REFERER']);
        if (!empty($p['scheme']) && !empty($p['host'])) {
            $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
        }
    }
    if (!in_array($origin, $allowed, true)) {
        app_log('warn', 'origin rejected', ['origin' => substr($origin, 0, 100)]);
        json_out(403, ['ok' => false, 'error' => 'Forbidden.']);
    }
}

/** Reads a JSON object body, capped at $maxBytes. */
function read_json(int $maxBytes = 8192): array
{
    $len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($len > $maxBytes) json_out(413, ['ok' => false, 'error' => 'Request too large.']);
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) json_out(413, ['ok' => false, 'error' => 'Request too large.']);
    try {
        $data = json_decode($raw, true, 6, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        json_out(400, ['ok' => false, 'error' => 'Invalid request.']);
    }
    if (!is_array($data)) json_out(400, ['ok' => false, 'error' => 'Invalid request.']);
    return $data;
}

// ─── Client IP ───────────────────────────────────────────────────────────────

/** Cloudflare's published ranges — https://www.cloudflare.com/ips/ ([VERIFY] refresh occasionally). */
const CLOUDFLARE_RANGES = [
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
    '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
    '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
    '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
    '2a06:98c0::/29', '2c0f:f248::/32',
];

function ip_in_cidr(string $ip, string $cidr): bool
{
    [$net, $bits] = array_pad(explode('/', $cidr, 2), 2, null);
    $ipBin = @inet_pton($ip);
    $netBin = @inet_pton((string) $net);
    if ($ipBin === false || $netBin === false || strlen($ipBin) !== strlen($netBin)) return false;
    $bits = $bits === null ? strlen($ipBin) * 8 : (int) $bits;
    $bytes = intdiv($bits, 8);
    $rem = $bits % 8;
    if ($bytes > 0 && substr($ipBin, 0, $bytes) !== substr($netBin, 0, $bytes)) return false;
    if ($rem === 0) return true;
    $mask = (0xFF << (8 - $rem)) & 0xFF;
    return (ord($ipBin[$bytes]) & $mask) === (ord($netBin[$bytes]) & $mask);
}

/**
 * REMOTE_ADDR is the source of truth. A proxy header (CF-Connecting-IP by default)
 * is trusted ONLY when the request really came from a trusted proxy range.
 * X-Forwarded-For is never trusted.
 */
function client_ip(): string
{
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    $trusted = [];
    if (cfg('TRUST_CLOUDFLARE', false)) $trusted = CLOUDFLARE_RANGES;
    $trusted = array_merge($trusted, (array) cfg('TRUSTED_PROXY_CIDRS', []));
    $header = (string) cfg('PROXY_IP_HEADER', 'HTTP_CF_CONNECTING_IP');

    if ($trusted && !empty($_SERVER[$header])) {
        foreach ($trusted as $cidr) {
            if (ip_in_cidr($remote, $cidr)) {
                $fwd = trim((string) $_SERVER[$header]);
                if (filter_var($fwd, FILTER_VALIDATE_IP)) return $fwd;
                break;
            }
        }
    }
    return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '0.0.0.0';
}

function ip_hash(string $ip): string
{
    $salt = (string) cfg('IP_HASH_SALT', '');
    if (strlen($salt) < 32) app_log('error', 'IP_HASH_SALT missing or shorter than 32 chars');
    return hash_hmac('sha256', $ip, $salt);
}

// ─── Small utils ─────────────────────────────────────────────────────────────

function is_uuid(mixed $v): bool
{
    return is_string($v) && (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $v);
}

function uuid_v4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

/** Very small UA parser — enough for dashboards; not for security decisions. */
function parse_ua(string $ua): array
{
    $browser = match (true) {
        str_contains($ua, 'Edg/') => 'Edge',
        str_contains($ua, 'SamsungBrowser') => 'Samsung Internet',
        str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
        str_contains($ua, 'FBAN') || str_contains($ua, 'FBAV') => 'Facebook in-app',
        str_contains($ua, 'Instagram') => 'Instagram in-app',
        str_contains($ua, 'Firefox/') => 'Firefox',
        str_contains($ua, 'Chrome/') || str_contains($ua, 'CriOS') => 'Chrome',
        str_contains($ua, 'Safari/') => 'Safari',
        default => 'Other',
    };
    $os = match (true) {
        str_contains($ua, 'Android') => 'Android',
        (bool) preg_match('/iPhone|iPad|iPod/', $ua) => 'iOS',
        str_contains($ua, 'Windows') => 'Windows',
        str_contains($ua, 'Mac OS X') => 'macOS',
        str_contains($ua, 'Linux') => 'Linux',
        default => 'Other',
    };
    return ['browser' => $browser, 'os' => $os];
}
