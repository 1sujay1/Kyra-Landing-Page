<?php
/**
 * Minimal Supabase PostgREST client over cURL, using the service-role / secret key
 * from the private config. Errors are logged, never returned to the browser.
 */
declare(strict_types=1);

/**
 * @return array{status:int, data:mixed, error:?string}
 */
function sb_request(string $method, string $path, ?array $body = null, array $extraHeaders = [], int $timeout = 5): array
{
    $base = rtrim((string) cfg('SUPABASE_URL', ''), '/');
    $key = (string) cfg('SUPABASE_SERVICE_ROLE_KEY', '');
    if ($base === '' || $key === '') {
        app_log('error', 'Supabase not configured');
        return ['status' => 0, 'data' => null, 'error' => 'not_configured'];
    }

    $headers = ['apikey: ' . $key, 'Accept: application/json', 'Content-Type: application/json'];
    // Legacy service_role keys are JWTs and go in Authorization too. New "sb_secret_…" keys only use apikey.
    if (str_starts_with($key, 'eyJ')) $headers[] = 'Authorization: Bearer ' . $key;
    $headers = array_merge($headers, $extraHeaders);

    $ch = curl_init($base . '/rest/v1/' . ltrim($path, '/'));
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = $raw === false ? curl_error($ch) : null;
    curl_close($ch);

    if ($err !== null || $status >= 400) {
        // PostgREST error bodies contain no secrets; keep the first 300 chars for debugging.
        app_log('error', 'supabase request failed', [
            'method' => $method,
            'path' => preg_replace('/phone=eq\.\d+/', 'phone=eq.xxx', strtok($path, '?') ?: $path),
            'status' => $status,
            'error' => $err ?? substr((string) $raw, 0, 300),
        ]);
        return ['status' => $status, 'data' => null, 'error' => $err ?? 'http_' . $status];
    }
    $data = ($raw === '' || $raw === false) ? null : json_decode((string) $raw, true);
    return ['status' => $status, 'data' => $data, 'error' => null];
}

function sb_rpc(string $fn, array $args, int $timeout = 5): array
{
    return sb_request('POST', 'rpc/' . $fn, $args, [], $timeout);
}
