// Visitor tracking for Kyra Landing Page.
// Captures visitor IP, location, device, referrer & project info, posts to CRM.
// Allows up to 4 tracking calls per day per visitor (counts page visits/refreshes up to 4).

const TRACK_KEY = 'kyra_visitor_track_v2';
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

  const crmBaseUrl = getCrmBaseUrl().replace(/\/+$/, '');
  const visitorTrackApi = `${crmBaseUrl}/api/visitors/track`;

  const today = new Date().toISOString().slice(0, 10);
  let currentCount = 0;

  const storedRaw = localStorage.getItem(TRACK_KEY);
  if (storedRaw) {
    try {
      const parsed = JSON.parse(storedRaw);
      if (parsed && parsed.date === today && typeof parsed.count === 'number') {
        currentCount = parsed.count;
      }
    } catch (err) {
      // Legacy format or invalid JSON
    }
  }

  // If already tracked 4 times today for this visitor, skip calling API
  if (currentCount >= MAX_DAILY_VISITS) {
    return;
  }

  const nextCount = currentCount + 1;
  const geoData = await getGeoLocationData();

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

  try {
    const res = await fetch(visitorTrackApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      localStorage.setItem(TRACK_KEY, JSON.stringify({ date: today, count: nextCount }));
    }
  } catch (err) {
    console.warn('[Visitor Tracking] Notice:', err);
    localStorage.setItem(TRACK_KEY, JSON.stringify({ date: today, count: nextCount }));
  }
}
