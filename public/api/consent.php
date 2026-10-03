<?php
/**
 * POST /api/consent.php — records the visitor's cookie choice.
 * accepted → keep the raw IP from now on; rejected → raw IP is erased.
 */
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/ratelimit.php';
require __DIR__ . '/lib/supabase.php';

guard_request();
$in = read_json(2048);

$visitorId = $in['visitor_id'] ?? '';
$status = $in['status'] ?? '';
$source = in_array($in['source'] ?? '', CONSENT_SOURCES, true) ? $in['source'] : 'banner';
if (!is_uuid($visitorId) || !in_array($status, ['accepted', 'rejected'], true)) {
    json_out(400, ['ok' => false, 'error' => 'Invalid request.']);
}

$ip = client_ip();
$ipHash = ip_hash($ip);
if (!rate_limit('consent', $ipHash, 20, 3600)) json_out(429, ['ok' => false, 'error' => 'Too many requests.']);

$res = sb_rpc('kyra_set_consent', [
    'p_visitor_id' => $visitorId,
    'p_ip_hash' => $ipHash,
    'p_status' => $status,
    'p_ip_raw' => $status === 'accepted' ? $ip : null,
    'p_categories' => ['analytics' => ($in['analytics'] ?? false) === true, 'marketing' => ($in['marketing'] ?? false) === true],
    'p_source' => $source,
]);

json_out($res['error'] === null ? 200 : 202, ['ok' => true]);
