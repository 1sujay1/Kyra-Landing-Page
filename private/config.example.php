<?php
/**
 * Copy to config.php and upload to the PRIVATE folder on Hostinger — never into public_html:
 *   /home/<user>/domains/<domain>/private/config.php   (next to public_html), or
 *   /home/<user>/private/config.php
 * Then set permission 600 (File Manager → right-click → Permissions).
 * Never commit the real config.php.
 */
return [
    // Supabase (Project Settings → API). Use the service_role key (legacy JWT) or a new "sb_secret_…" key.
    'SUPABASE_URL'              => 'https://YOUR-PROJECT.supabase.co',
    'SUPABASE_SERVICE_ROLE_KEY' => '',

    // Random 32+ characters, e.g. `php -r "echo bin2hex(random_bytes(32));"`. Never change it after launch
    // (visitors' IP hashes would no longer match).
    'IP_HASH_SALT'              => '',

    // Exact origin of the landing page (scheme + host, no trailing slash). www/non-www twin is allowed automatically.
    'ALLOWED_ORIGIN'            => 'https://kyragroupindia.com',
    'EXTRA_ALLOWED_ORIGINS'     => [],          // e.g. ['https://staging.kyragroupindia.com']

    // Client IP behind a proxy/CDN. Leave false on plain Hostinger hosting (REMOTE_ADDR is correct).
    // Set true only if the domain is proxied through Cloudflare (orange cloud).
    'TRUST_CLOUDFLARE'          => false,
    'TRUSTED_PROXY_CIDRS'       => [],          // other CDN ranges, e.g. Hostinger CDN [VERIFY with Hostinger]
    'PROXY_IP_HEADER'           => 'HTTP_CF_CONNECTING_IP',

    // Meta Pixel + Conversions API (Events Manager → Settings → Generate access token)
    'META_PIXEL_ID'             => '',
    'META_CAPI_ACCESS_TOKEN'    => '',
    'META_TEST_EVENT_CODE'      => '',          // e.g. 'TEST12345' while testing; empty in production
    'META_GRAPH_VERSION'        => 'v23.0',

    // Notifications
    'SALES_NOTIFY_EMAIL'        => '',          // e.g. 'sales@kyragroupindia.com'
    'MAIL_FROM'                 => '',          // a mailbox on your domain, e.g. 'no-reply@kyragroupindia.com'
    'WHATSAPP_PROVIDER'         => 'none',      // 'cloud' | 'aisensy' | 'interakt' | 'none'
    'WHATSAPP_API_TOKEN'        => '',
    'WHATSAPP_PHONE_NUMBER_ID'  => '',          // Cloud API only
    'SALES_NOTIFY_NUMBER'       => '',          // comma-separated, with country code: '919087266613'
    'WA_TEMPLATE_SALES'         => 'new_lead_alert',   // approved template: {{1}} name {{2}} phone {{3}} intent {{4}} budget
    'WA_TEMPLATE_LEAD'          => 'lead_thank_you',   // approved template: {{1}} first name
    'WA_TEMPLATE_LANG'          => 'en',

    // Geolocation
    'MAXMIND_ACCOUNT_ID'        => '',
    'MAXMIND_LICENSE_KEY'       => '',
    'GEOIP_DB_PATH'             => '',          // default: <private>/geo/GeoLite2-City.mmdb
    'IPINFO_TOKEN'              => '',          // fallback only
];
