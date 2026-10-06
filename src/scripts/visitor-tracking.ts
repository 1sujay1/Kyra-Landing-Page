// Visitor tracking for Kyra Landing Page.
// Captures visitor IP, location, device, referrer & project info, posts to CRM.
// Tracks up to 4 visits/refreshes per day independently for each device category (mobile, tablet, desktop).

const MAX_DAILY_VISITS = 4;

declare global {
  interface Window {
    __kyraGeoData?: Record<string, any>;
  }
}

function getCrmBaseUrl() {
  if (typeof window !== 'undefined' && (window as any).CRM_BASE_URL) {
    return String((window as any).CRM_BASE_URL);
  }
  return import.meta.env.PUBLIC_CRM_BASE_URL || 'https://crm.kyragroupindia.com';
}

function getDeviceCategory(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = (navigator.userAgent || '').toLowerCase();
  const width = window.innerWidth || document.documentElement.clientWidth || screen.width || 1024;

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua) || (width >= 600 && width <= 1024 && 'ontouchstart' in window)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua) || width < 600) {
    return 'mobile';
  }
  return 'desktop';
}

export async function getGeoLocationData(): Promise<Record<string, any>> {
  if (typeof window !== 'undefined' && window.__kyraGeoData) {
    return window.__kyraGeoData;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);

    const geoRes = await fetch('https://ipapi.co/json/', {
      signal: ctrl.signal,
    }).catch(() => null);

    clearTimeout(timer);

    if (geoRes && geoRes.ok) {
      const data = await geoRes.json().catch(() => ({}));
      if (typeof window !== 'undefined') {
        window.__kyraGeoData = data;
      }
      return data;
    }
  } catch (err) {
    // Silent catch if IP API is unreachable
  }
  return {};
}

export async function initVisitorTracking() {
  if (typeof window === 'undefined') return;

  const deviceCategory = getDeviceCategory();
  const trackKey = `kyra_visitor_track_${deviceCategory}`;
  const today = new Date().toISOString().slice(0, 10);
  let currentCount = 0;

  const storedRaw = localStorage.getItem(trackKey);
  if (storedRaw) {
    try {
      const parsed = JSON.parse(storedRaw);
      // If stored date is NOT today, clear localstorage and set fields freshly
      if (parsed && parsed.date === today && typeof parsed.count === 'number') {
        currentCount = parsed.count;
      } else {
        localStorage.removeItem(trackKey);
        currentCount = 0;
      }
    } catch (err) {
      localStorage.removeItem(trackKey);
      currentCount = 0;
    }
  }

  // Clean up legacy single-device key if outdated
  const legacyRaw = localStorage.getItem('kyra_visitor_track_v2');
  if (legacyRaw) {
    try {
      const legacyParsed = JSON.parse(legacyRaw);
      if (legacyParsed && legacyParsed.date !== today) {
        localStorage.removeItem('kyra_visitor_track_v2');
      }
    } catch (e) {
      localStorage.removeItem('kyra_visitor_track_v2');
    }
  }

  // If this device has already reached 4 calls today, skip calling API
  if (currentCount >= MAX_DAILY_VISITS) {
    return;
  }

  const nextCount = currentCount + 1;
  const geoData = await getGeoLocationData();
  const crmBaseUrl = getCrmBaseUrl().replace(/\/+$/, '');
  const visitorTrackApi = `${crmBaseUrl}/api/visitors/track`;

  const payload = {
    ip: geoData.ip || '',
    city: geoData.city || 'Coimbatore',
    region: geoData.region || 'Tamil Nadu',
    country: geoData.country_name || 'India',
    postal: geoData.postal || '',
    org: geoData.org || geoData.asn || '',
    user_agent: navigator.userAgent || '',
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    referrer: document.referrer || 'Direct Visit',
    page_url: location.href.slice(0, 500),
    project_name: 'Kyra Farmlands',
    visit_count: nextCount,
  };

  // Call API BEFORE updating localStorage for this device
  try {
    const res = await fetch(visitorTrackApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      localStorage.setItem(trackKey, JSON.stringify({ date: today, count: nextCount }));
    }
  } catch (err) {
    console.warn('[Visitor Tracking] Notice:', err);
    localStorage.setItem(trackKey, JSON.stringify({ date: today, count: nextCount }));
  }
}
