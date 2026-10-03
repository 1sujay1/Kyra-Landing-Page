<?php
/**
 * Server-side validation. The browser validates too, but nothing from the
 * client is trusted. Keep the allow-lists in sync with src/content/site.ts.
 */
declare(strict_types=1);

const BUDGETS = ['under_10l', '10_25l', '25_50l', '50l_plus'];
const INTENTS = ['site_visit', 'price', 'brochure', 'callback'];
const CONSENT_SOURCES = ['banner', 'preferences', 'lead_form'];
const TRACK_EVENTS = [
    'page_view', 'section_view', 'cta_click', 'popup_open', 'form_start',
    'lead_submit', 'video_play', 'whatsapp_click', 'call_click',
];
// Must match `consentText` in src/content/site.ts exactly. Stored with each lead.
const CONSENT_TEXT = 'I agree to be contacted by Kyra Group via call, SMS and WhatsApp about this enquiry. I have read the Privacy Policy.';

/** Strips tags and control characters, collapses whitespace, caps length. */
function clean_text(mixed $v, int $max, bool $multiline = false): string
{
    if (!is_string($v) && !is_numeric($v)) return '';
    $s = strip_tags((string) $v);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    $s = $multiline ? preg_replace("/[ \t]+/u", ' ', $s) : preg_replace('/\s+/u', ' ', $s);
    $s = trim((string) $s);
    return mb_substr($s, 0, $max, 'UTF-8');
}

function normalise_phone(mixed $v): string
{
    $d = preg_replace('/\D/', '', is_string($v) ? $v : '') ?? '';
    if (strlen($d) === 12 && str_starts_with($d, '91')) $d = substr($d, 2);
    if (strlen($d) === 11 && str_starts_with($d, '0')) $d = substr($d, 1);
    return $d;
}

/**
 * @return array{0: ?array, 1: ?string, 2: ?string}  [lead, errorMessage, fieldName]
 */
function validate_lead(array $in): array
{
    $name = clean_text($in['name'] ?? '', 60);
    if (mb_strlen($name) < 2) return [null, 'Enter your full name', 'name'];
    if (!preg_match("/^[\p{L}\p{M} .'-]+$/u", $name)) return [null, 'Use letters and spaces only', 'name'];

    $phone = normalise_phone($in['phone'] ?? '');
    if (!preg_match('/^[6-9]\d{9}$/', $phone)) return [null, 'Enter a valid 10-digit mobile number', 'phone'];

    $budget = is_string($in['budget'] ?? null) ? $in['budget'] : '';
    if (!in_array($budget, BUDGETS, true)) return [null, 'Choose your budget', 'budget'];

    $intent = is_string($in['intent'] ?? null) && in_array($in['intent'], INTENTS, true) ? $in['intent'] : 'site_visit';

    $visitDate = null;
    $rawDate = is_string($in['visit_date'] ?? null) ? trim($in['visit_date']) : '';
    if ($rawDate !== '') {
        $tz = new DateTimeZone('Asia/Kolkata');
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $rawDate, $tz);
        $today = new DateTimeImmutable('today', $tz);
        // One day of slack either side for visitors in other time zones (NRIs).
        if (!$d || $d->format('Y-m-d') !== $rawDate || $d < $today->modify('-1 day') || $d > $today->modify('+31 days')) {
            return [null, 'Choose a date within the next 30 days', 'visit_date'];
        }
        $visitDate = $rawDate;
    }

    $message = clean_text($in['message'] ?? '', 1000, true);

    if (($in['consent'] ?? false) !== true) return [null, 'Please agree to be contacted so we can reach you', 'consent'];

    return [[
        'name' => $name,
        'phone' => $phone,
        'budget' => $budget,
        'intent' => $intent,
        'visit_date' => $visitDate,
        'message' => $message === '' ? null : $message,
    ], null, null];
}

/** Keeps attribution to known keys and short string values. */
function clean_attribution(mixed $a): array
{
    $keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'landing', 'referrer', 'ts'];
    $out = [];
    foreach (['first', 'last'] as $slot) {
        if (!is_array($a[$slot] ?? null)) continue;
        foreach ($keys as $k) {
            $v = $a[$slot][$k] ?? null;
            if (is_string($v) || is_int($v) || is_float($v)) $out[$slot][$k] = clean_text((string) $v, 150);
        }
    }
    return $out;
}

/** Event payloads: at most 10 flat keys, short scalar values. */
function clean_event_data(mixed $d): array
{
    if (!is_array($d)) return [];
    $out = [];
    foreach ($d as $k => $v) {
        if (count($out) >= 10) break;
        if (!is_string($k) || !preg_match('/^[a-z_]{1,32}$/', $k)) continue;
        if (is_bool($v) || is_int($v) || is_float($v)) $out[$k] = $v;
        elseif (is_string($v)) $out[$k] = clean_text($v, 200);
    }
    return $out;
}

function clean_url(mixed $u): ?string
{
    if (!is_string($u) || $u === '') return null;
    $u = mb_substr($u, 0, 500);
    return filter_var($u, FILTER_VALIDATE_URL) && preg_match('#^https?://#i', $u) ? $u : null;
}
