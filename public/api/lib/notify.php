<?php
/**
 * Lead notifications (server-side only):
 *  - email to the sales team (PHP mail(), works on Hostinger once the domain mailbox exists)
 *  - WhatsApp to the sales team + auto-reply to the lead, via one of:
 *      'cloud'   WhatsApp Cloud API (Meta) — approved templates required
 *      'aisensy' AiSensy campaign API      [VERIFY payload with your AiSensy dashboard]
 *      'interakt' Interakt public API       [VERIFY payload with your Interakt dashboard]
 *      'none'    disabled
 * Failures are logged and never affect the visitor.
 */
declare(strict_types=1);

const BUDGET_LABELS = [
    'under_10l' => 'Under ₹10 lakh', '10_25l' => '₹10–25 lakh', '25_50l' => '₹25–50 lakh', '50l_plus' => '₹50 lakh+',
];
const INTENT_LABELS = [
    'site_visit' => 'Site visit', 'price' => 'Price details', 'brochure' => 'Brochure', 'callback' => 'Call back',
];

function notify_lead(array $lead, array $ctx): void
{
    $summary = sprintf(
        "New %s lead: %s, +91 %s, budget %s%s%s%s",
        INTENT_LABELS[$lead['intent']] ?? $lead['intent'],
        $lead['name'],
        $lead['phone'],
        BUDGET_LABELS[$lead['budget']] ?? $lead['budget'],
        $lead['visit_date'] ? ', visit ' . $lead['visit_date'] : '',
        !empty($ctx['city']) ? ', from ' . $ctx['city'] : '',
        !empty($ctx['source']) ? ', source ' . $ctx['source'] : ''
    );

    notify_email($lead, $summary, $ctx);

    $provider = (string) cfg('WHATSAPP_PROVIDER', 'none');
    if ($provider === 'none') return;

    foreach (array_filter(array_map('trim', explode(',', (string) cfg('SALES_NOTIFY_NUMBER', '')))) as $to) {
        whatsapp_send($provider, preg_replace('/\D/', '', $to), (string) cfg('WA_TEMPLATE_SALES', 'new_lead_alert'), [
            $lead['name'], '+91 ' . $lead['phone'], INTENT_LABELS[$lead['intent']] ?? '', BUDGET_LABELS[$lead['budget']] ?? '',
        ]);
    }
    // Auto-reply to the lead (they consented to WhatsApp contact on the form).
    whatsapp_send($provider, '91' . $lead['phone'], (string) cfg('WA_TEMPLATE_LEAD', 'lead_thank_you'), [
        explode(' ', $lead['name'])[0],
    ]);
}

function notify_email(array $lead, string $summary, array $ctx): void
{
    $to = (string) cfg('SALES_NOTIFY_EMAIL', '');
    if ($to === '') return;
    $from = (string) cfg('MAIL_FROM', 'no-reply@' . (parse_url((string) cfg('ALLOWED_ORIGIN'), PHP_URL_HOST) ?: 'localhost'));
    $body = $summary . "\n\n"
        . 'Message: ' . ($lead['message'] ?? '-') . "\n"
        . 'Lead ID: ' . $ctx['lead_id'] . ($ctx['duplicate'] ? ' (repeat enquiry within 24h)' : '') . "\n"
        . 'Page: ' . ($ctx['page_url'] ?? '-') . "\n";
    $headers = [
        'From: Kyra Website <' . $from . '>',
        'Content-Type: text/plain; charset=UTF-8',
        'X-Auto-Response-Suppress: All',
    ];
    $subject = '=?UTF-8?B?' . base64_encode('New lead: ' . $lead['name'] . ' (' . (INTENT_LABELS[$lead['intent']] ?? '') . ')') . '?=';
    if (!@mail($to, $subject, $body, implode("\r\n", $headers))) app_log('warn', 'lead email failed');
}

function whatsapp_send(string $provider, string $to, string $template, array $params): void
{
    if ($to === '' || $template === '') return;
    $token = (string) cfg('WHATSAPP_API_TOKEN', '');
    if ($token === '') return;

    switch ($provider) {
        case 'cloud':
            $phoneId = (string) cfg('WHATSAPP_PHONE_NUMBER_ID', '');
            $version = (string) cfg('META_GRAPH_VERSION', 'v23.0');
            $url = "https://graph.facebook.com/$version/$phoneId/messages";
            $headers = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
            $body = [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'template',
                'template' => [
                    'name' => $template,
                    'language' => ['code' => (string) cfg('WA_TEMPLATE_LANG', 'en')],
                    'components' => [[
                        'type' => 'body',
                        'parameters' => array_map(fn ($p) => ['type' => 'text', 'text' => (string) $p], $params),
                    ]],
                ],
            ];
            break;
        case 'aisensy':
            $url = 'https://backend.aisensy.com/campaign/t1/api/v2';
            $headers = ['Content-Type: application/json'];
            $body = [
                'apiKey' => $token,
                'campaignName' => $template, // AiSensy uses the campaign name
                'destination' => $to,
                'userName' => (string) ($params[0] ?? 'Customer'),
                'templateParams' => array_map('strval', $params),
            ];
            break;
        case 'interakt':
            $url = 'https://api.interakt.ai/v1/public/message/';
            $headers = ['Authorization: Basic ' . $token, 'Content-Type: application/json'];
            $body = [
                'countryCode' => '+' . substr($to, 0, 2),
                'phoneNumber' => substr($to, 2),
                'type' => 'Template',
                'template' => ['name' => $template, 'languageCode' => (string) cfg('WA_TEMPLATE_LANG', 'en'), 'bodyValues' => array_map('strval', $params)],
            ];
            break;
        default:
            return;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 6,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($status < 200 || $status >= 300) {
        app_log('warn', 'whatsapp send failed', ['provider' => $provider, 'to' => mask_phone($to), 'status' => $status, 'body' => substr((string) $raw, 0, 200)]);
    }
}
