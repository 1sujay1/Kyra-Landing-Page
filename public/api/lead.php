<?php
/**
 * POST /api/lead.php — lead capture.
 *  1. Validate (server-side, allow-lists, length caps)
 *  2. Bot checks (honeypot + minimum fill time) and rate limits
 *     (30 attempts / IP / hour; 5 valid submissions / IP / hour)
 *  3. Upsert visitor, insert lead (same phone within 24 h → update existing lead)
 *  4. Respond { ok, leadId, eventId } — then notify sales + Meta CAPI after the response
 * If Supabase is down, the lead is written to <private>/logs/leads-fallback.jsonl
 * and the sales email still goes out, so no enquiry is lost.
 */
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/validate.php';
require __DIR__ . '/lib/ratelimit.php';
require __DIR__ . '/lib/supabase.php';
require __DIR__ . '/lib/geo.php';
require __DIR__ . '/lib/meta_capi.php';
require __DIR__ . '/lib/notify.php';

guard_request();
$in = read_json(8192);

$ip = client_ip();
$ipHash = ip_hash($ip);

const TOO_MANY = ['ok' => false, 'error' => 'Too many requests. Please call or WhatsApp us instead.'];
// Loose cap on all attempts (typos included); the strict 5/hour cap applies to valid submissions below.
if (!rate_limit('lead_any', $ipHash, 30, 3600)) json_out(429, TOO_MANY);

// ─── Bot checks: pretend success so bots learn nothing; no conversion fires (leadId null).
$elapsed = is_numeric($in['elapsed_ms'] ?? null) ? (int) $in['elapsed_ms'] : 0;
if (($in['website'] ?? '') !== '' || $elapsed < 3000) {
    app_log('info', 'lead rejected as bot', ['reason' => ($in['website'] ?? '') !== '' ? 'honeypot' : 'too_fast', 'ms' => $elapsed]);
    json_out(200, ['ok' => true, 'leadId' => null, 'eventId' => null]);
}

[$lead, $error, $field] = validate_lead($in);
if ($error !== null) json_out(422, ['ok' => false, 'error' => $error, 'field' => $field]);
if (!rate_limit('lead', $ipHash, 5, 3600)) json_out(429, TOO_MANY);

$visitorId = is_uuid($in['visitor_id'] ?? null) ? $in['visitor_id'] : uuid_v4();
$sessionId = is_string($in['session_id'] ?? null) && preg_match('/^[a-zA-Z0-9-]{8,64}$/', $in['session_id']) ? $in['session_id'] : null;
$bannerConsent = in_array($in['consent_status'] ?? '', ['pending', 'accepted', 'rejected'], true) ? $in['consent_status'] : 'pending';
// The form's consent checkbox counts as consent, unless the visitor explicitly rejected cookies.
$measurementOk = $bannerConsent !== 'rejected';
$attr = clean_attribution($in['attribution'] ?? []);
$last = $attr['last'] ?? ($attr['first'] ?? []);
$pageUrl = clean_url($in['page_url'] ?? null);
$geo = geo_lookup($ip, $ipHash);
$ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400);
$uaInfo = parse_ua($ua);
$now = gmdate('c');

// 1) Make sure the visitor row exists (FK) and log the lead_submit event.
sb_rpc('kyra_track', [
    'p_visitor_id' => $visitorId,
    'p_ip_hash' => $ipHash,
    'p_ip_raw' => $measurementOk ? $ip : null,
    'p_country' => $geo['country'] ?? null,
    'p_region' => $geo['region'] ?? null,
    'p_city' => $geo['city'] ?? null,
    'p_latitude' => $geo['latitude'] ?? null,
    'p_longitude' => $geo['longitude'] ?? null,
    'p_device' => null,
    'p_browser' => $uaInfo['browser'],
    'p_os' => $uaInfo['os'],
    'p_first_utm' => $attr['first'] ?? null,
    'p_last_utm' => $attr['last'] ?? null,
    'p_consent' => $measurementOk ? 'accepted' : 'rejected',
    'p_new_visit' => false,
    'p_session_id' => $sessionId,
    'p_event_type' => 'lead_submit',
    'p_event_data' => ['intent' => $lead['intent'], 'budget' => $lead['budget']],
    'p_page_url' => $pageUrl,
]);

$row = [
    'visitor_id' => $visitorId,
    'name' => $lead['name'],
    'phone' => $lead['phone'],
    'email' => $lead['email'] ?? null,
    'budget' => $lead['budget'],
    'visit_date' => $lead['visit_date'],
    'message' => $lead['message'],
    'intent' => $lead['intent'],
    'utm' => $attr ?: null,
    'gclid' => $last['gclid'] ?? null,
    'fbclid' => $last['fbclid'] ?? null,
    'city' => $geo['city'] ?? null,
    'region' => $geo['region'] ?? null,
    'consent_given' => true,
    'consent_text' => CONSENT_TEXT,
    'consent_at' => $now,
    'page_url' => $pageUrl,
];

// 2) Duplicate handling: same phone within 24 h → update that lead instead of creating a new one.
$duplicate = false;
$leadId = null;
$since = gmdate('Y-m-d\TH:i:s\Z', time() - 86400);
$found = sb_request('GET', 'leads?select=id,submissions&phone=eq.' . $lead['phone'] . '&created_at=gte.' . rawurlencode($since) . '&order=created_at.desc&limit=1');
$stored = false;

if ($found['error'] === null && !empty($found['data'][0]['id'])) {
    $duplicate = true;
    $leadId = $found['data'][0]['id'];
    $patch = $row + ['submissions' => (int) ($found['data'][0]['submissions'] ?? 1) + 1, 'updated_at' => $now];
    // Do not wipe earlier answers with empty optional fields.
    foreach (['visit_date', 'message', 'utm', 'gclid', 'fbclid', 'city', 'region', 'page_url'] as $k) {
        if ($patch[$k] === null) unset($patch[$k]);
    }
    $stored = sb_request('PATCH', 'leads?id=eq.' . rawurlencode($leadId), $patch, ['Prefer: return=minimal'])['error'] === null;
} elseif ($found['error'] === null) {
    $leadId = uuid_v4();
    $stored = sb_request('POST', 'leads', $row + ['id' => $leadId], ['Prefer: return=minimal'])['error'] === null;
}

if (!$stored) {
    // Supabase unavailable: never lose the enquiry.
    $leadId ??= uuid_v4();
    $line = json_encode($row + ['id' => $leadId, 'saved_at' => $now], JSON_UNESCAPED_UNICODE) . "\n";
    $ok = @file_put_contents(kyra_private_dir() . '/logs/leads-fallback.jsonl', $line, FILE_APPEND | LOCK_EX);
    app_log('error', 'lead stored in fallback file', ['lead_id' => $leadId, 'phone' => mask_phone($lead['phone']), 'file_ok' => $ok !== false]);
    if ($ok === false) json_out(500, ['ok' => false, 'error' => 'We could not save your details. Please call or WhatsApp us.']);
}

$eventId = 'lead.' . $leadId;
app_log('info', 'lead saved', ['lead_id' => $leadId, 'phone' => mask_phone($lead['phone']), 'intent' => $lead['intent'], 'duplicate' => $duplicate]);

// 3) Reply now. A repeat enquiry is still a success for the visitor, but we don't
//    count it as a second conversion (leadId null → browser fires nothing).
respond_and_continue(200, [
    'ok' => true,
    'leadId' => $duplicate ? null : $leadId,
    'eventId' => $duplicate ? null : $eventId,
]);

// 4) After the response: notifications and server-side conversion.
$source = trim(($last['utm_source'] ?? '') . ' / ' . ($last['utm_campaign'] ?? ''), ' /');
try {
    notify_lead($lead, ['lead_id' => $leadId, 'duplicate' => $duplicate, 'city' => $geo['city'] ?? null, 'source' => $source, 'page_url' => $pageUrl]);
} catch (Throwable $e) {
    app_log('error', 'notify failed', ['error' => $e->getMessage()]);
}

if (!$duplicate && $measurementOk) {
    try {
        meta_capi_lead($lead, [
            'event_id' => $eventId,
            'visitor_id' => $visitorId,
            'ip' => $ip,
            'ua' => $ua,
            'city' => $geo['city'] ?? null,
            'fbp' => is_string($in['fbp'] ?? null) && preg_match('/^fb\.\d\.\d+\.\d+$/', $in['fbp']) ? $in['fbp'] : '',
            'fbc' => meta_fbc(is_string($in['fbc'] ?? null) ? $in['fbc'] : '', (string) ($last['fbclid'] ?? '')),
            'page_url' => $pageUrl,
        ]);
    } catch (Throwable $e) {
        app_log('error', 'capi failed', ['error' => $e->getMessage()]);
    }
}
