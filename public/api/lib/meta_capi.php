<?php
/**
 * Meta Conversions API — server-side "Lead" event. Uses the same event_id as the
 * browser Pixel so Meta de-duplicates the two. PII is SHA-256 hashed per Meta spec.
 */
declare(strict_types=1);

function meta_capi_lead(array $lead, array $ctx): void
{
    $pixel = (string) cfg('META_PIXEL_ID', '');
    $token = (string) cfg('META_CAPI_ACCESS_TOKEN', '');
    if ($pixel === '' || $token === '') return;

    $h = static fn (string $v): string => hash('sha256', mb_strtolower(trim($v), 'UTF-8'));
    $nameParts = preg_split('/\s+/', $lead['name']) ?: [];
    $first = $nameParts[0] ?? '';
    $last = count($nameParts) > 1 ? end($nameParts) : '';

    $userData = array_filter([
        'ph' => [$h('91' . $lead['phone'])],
        'fn' => $first !== '' ? [$h($first)] : null,
        'ln' => $last !== '' ? [$h($last)] : null,
        'ct' => !empty($ctx['city']) ? [$h(preg_replace('/[^a-z]/', '', strtolower($ctx['city'])))] : null,
        'country' => [$h('in')],
        'external_id' => !empty($ctx['visitor_id']) ? [$h($ctx['visitor_id'])] : null,
        'client_ip_address' => $ctx['ip'] ?? null,
        'client_user_agent' => $ctx['ua'] ?? null,
        'fbp' => $ctx['fbp'] ?: null,
        'fbc' => $ctx['fbc'] ?: null,
    ]);

    $event = [
        'event_name' => 'Lead',
        'event_time' => time(),
        'event_id' => $ctx['event_id'],
        'action_source' => 'website',
        'event_source_url' => $ctx['page_url'] ?? cfg('ALLOWED_ORIGIN'),
        'user_data' => $userData,
        'custom_data' => ['lead_intent' => $lead['intent'], 'budget' => $lead['budget']],
    ];
    $payload = ['data' => [$event]];
    if ($test = cfg('META_TEST_EVENT_CODE')) $payload['test_event_code'] = $test;

    $version = (string) cfg('META_GRAPH_VERSION', 'v23.0');
    $ch = curl_init("https://graph.facebook.com/$version/" . rawurlencode($pixel) . '/events');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload + ['access_token' => $token]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 6,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($status !== 200) {
        app_log('warn', 'meta capi failed', ['status' => $status, 'body' => substr((string) $raw, 0, 300)]);
    }
}

/** Builds fbc from an fbclid when the _fbc cookie is not set yet. */
function meta_fbc(string $cookieFbc, string $fbclid): string
{
    if (preg_match('/^fb\.\d\.\d+\.[\w-]+$/', $cookieFbc)) return $cookieFbc;
    if ($fbclid !== '' && preg_match('/^[\w-]{10,}$/', $fbclid)) return 'fb.1.' . (int) (microtime(true) * 1000) . '.' . $fbclid;
    return '';
}
