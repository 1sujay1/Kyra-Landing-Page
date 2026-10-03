<?php
/**
 * POST /api/track.php — first-party visitor events (sendBeacon).
 * Stores a salted IP hash always; the raw IP only when consent is "accepted".
 * Responds 204 immediately, then writes to Supabase.
 */
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/ratelimit.php';
require __DIR__ . '/lib/supabase.php';
require __DIR__ . '/lib/geo.php';

guard_request();
$in = read_json(8192);

$event = $in['e'] ?? '';
$visitorId = $in['v'] ?? '';
if (!in_array($event, TRACK_EVENTS, true) || !is_uuid($visitorId)) {
    json_out(400, ['ok' => false, 'error' => 'Invalid request.']);
}
$sessionId = is_string($in['s'] ?? null) && preg_match('/^[a-zA-Z0-9-]{8,64}$/', $in['s']) ? $in['s'] : null;
$consent = in_array($in['c'] ?? '', ['pending', 'accepted', 'rejected'], true) ? $in['c'] : 'pending';

$ip = client_ip();
$ipHash = ip_hash($ip);
if (!rate_limit('track', $ipHash, 60, 60)) {
    http_response_code(429);
    exit;
}

// Reply to the browser now; the rest happens after the connection closes.
respond_and_continue(204);

$geo = geo_lookup($ip, $ipHash);
$ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400);
$uaInfo = parse_ua($ua);

$device = null;
if ($event === 'page_view' && is_array($in['dev'] ?? null)) {
    $t = $in['dev']['type'] ?? '';
    $device = in_array($t, ['mobile', 'tablet', 'desktop'], true) ? $t : null;
}
$attr = $event === 'page_view' ? clean_attribution($in['a'] ?? []) : [];

$data = clean_event_data($in['d'] ?? []);
if ($event === 'page_view') {
    $data['referrer'] = clean_url($in['r'] ?? null);
    if (is_array($in['dev'] ?? null)) {
        $data['screen'] = (int) ($in['dev']['w'] ?? 0) . 'x' . (int) ($in['dev']['h'] ?? 0);
        $data['lang'] = clean_text($in['dev']['lang'] ?? '', 20);
    }
}

sb_rpc('kyra_track', [
    'p_visitor_id' => $visitorId,
    'p_ip_hash' => $ipHash,
    'p_ip_raw' => $consent === 'accepted' ? $ip : null,
    'p_country' => $geo['country'] ?? null,
    'p_region' => $geo['region'] ?? null,
    'p_city' => $geo['city'] ?? null,
    'p_latitude' => $geo['latitude'] ?? null,
    'p_longitude' => $geo['longitude'] ?? null,
    'p_device' => $device,
    'p_browser' => $uaInfo['browser'],
    'p_os' => $uaInfo['os'],
    'p_first_utm' => $attr['first'] ?? null,
    'p_last_utm' => $attr['last'] ?? null,
    'p_consent' => $consent,
    'p_new_visit' => $event === 'page_view' && ($in['nv'] ?? false) === true,
    'p_session_id' => $sessionId,
    'p_event_type' => $event,
    'p_event_data' => $data ?: null,
    'p_page_url' => clean_url($in['u'] ?? null),
], 4);
