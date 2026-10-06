// First-time daily visitor tracking for Kyra Landing Page.
// Captures visitor IP, location, device, referrer & project info, posts to CRM,
// and saves timestamp in localStorage so refreshes do NOT re-trigger API calls.

const TRACK_KEY = 'kyra_visitor_tracked_date';

function getCrmBaseUrl() {
  if (typeof window !== 'undefined') {
    if ((window as any).CRM_BASE_URL) return String((window as any).CRM_BASE_URL);
    const host = location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    if (isLocalhost) {
      const envUrl = import.meta.env.PUBLIC_CRM_BASE_URL;
      return (envUrl && envUrl.includes('localhost')) ? envUrl : 'http://localhost:3000';
    }
    const envUrl = import.meta.env.PUBLIC_CRM_BASE_URL;
    if (envUrl && !envUrl.includes('localhost')) {
      return envUrl;
    }
    return 'https://crm.kyragroupindia.com';
  }
  return import.meta.env.PUBLIC_CRM_BASE_URL || 'https://crm.kyragroupindia.com';
}

export async function initVisitorTracking() {
  if (typeof window === 'undefined') return;

  const crmBaseUrl = getCrmBaseUrl().replace(/\/+$/, '');
  const visitorTrackApi = `${crmBaseUrl}/api/visitors/track`;

  const today = new Date().toISOString().slice(0, 10);
  const lastTracked = localStorage.getItem(TRACK_KEY);

  // If already tracked today for this visitor, skip calling API on page refresh
  if (lastTracked === today) {
    return;
  }

  let geoData: Record<string, any> = {};

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);

    const geoRes = await fetch('https://ipapi.co/json/', {
      signal: ctrl.signal,
    }).catch(() => null);

    clearTimeout(timer);

    if (geoRes && geoRes.ok) {
      geoData = await geoRes.json().catch(() => ({}));
    }
  } catch (err) {
    // Silent catch if IP API is blocked or offline
  }

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
  };

  try {
    const res = await fetch(visitorTrackApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      localStorage.setItem(TRACK_KEY, today);
    }
  } catch (err) {
    console.warn('[Visitor Tracking] Notice:', err);
    // Store key anyway to avoid flooding broken network attempts
    localStorage.setItem(TRACK_KEY, today);
  }
}
