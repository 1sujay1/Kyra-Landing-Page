// First-party visitor tracking → POST /api/track.php via sendBeacon.
// The server hashes the IP and only stores the raw IP when consent is "accepted".

import { getCookie, setCookie, store, uuid } from './lib';
import { consentStatus } from './consent';

const ENDPOINT = '/api/track.php';
const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const;

export type TrackEvent =
  | 'page_view' | 'section_view' | 'cta_click' | 'popup_open' | 'form_start'
  | 'lead_submit' | 'video_play' | 'whatsapp_click' | 'call_click';

type Touch = Partial<Record<(typeof ATTR_KEYS)[number], string>> & { landing?: string; referrer?: string; ts?: number };
export type Attribution = { first?: Touch; last?: Touch };

function visitorId(): string {
  let id = getCookie('kyra_vid');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) id = uuid();
  setCookie('kyra_vid', id, 365); // refresh expiry on every visit
  return id;
}

let newSession = false;
function sessionId(): string {
  let id = store.get('kyra_sid', true);
  if (!id) { id = uuid(); store.set('kyra_sid', id, true); newSession = true; }
  return id;
}

/** UTM / click IDs persist for 90 days so they attach to a lead made on a later visit. */
function captureAttribution(): Attribution {
  let attr: Attribution = {};
  try { attr = JSON.parse(getCookie('kyra_attr') || '{}'); } catch { /* reset */ }
  const q = new URLSearchParams(location.search);
  const touch: Touch = {};
  for (const k of ATTR_KEYS) {
    const v = q.get(k);
    if (v) touch[k] = v.slice(0, 150);
  }
  if (Object.keys(touch).length) {
    touch.landing = location.pathname;
    touch.referrer = document.referrer ? new URL(document.referrer).hostname : '';
    touch.ts = Date.now();
    attr.first ??= touch;
    attr.last = touch;
    setCookie('kyra_attr', JSON.stringify(attr), 90);
  }
  return attr;
}

const device = () => {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const w = screen.width;
  return { type: coarse ? (Math.min(w, screen.height) >= 600 ? 'tablet' : 'mobile') : 'desktop', w, h: screen.height, lang: navigator.language };
};

export const ids = { visitor: visitorId(), session: sessionId() };
export const attribution = captureAttribution();

export function track(event: TrackEvent, data: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = {
    v: ids.visitor,
    s: ids.session,
    e: event,
    d: data,
    u: location.href.slice(0, 500),
    c: consentStatus(),
  };
  if (event === 'page_view') {
    body.r = document.referrer.slice(0, 300);
    body.a = attribution;
    body.dev = device();
    body.nv = newSession; // first page view of a new session → visit_count + 1
  }
  const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
  if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
    fetch(ENDPOINT, { method: 'POST', body: blob, keepalive: true, credentials: 'same-origin' }).catch(() => {});
  }
}

/** page_view, section views and delegated click tracking. Call once. */
export function initTracking() {
  track('page_view');

  const seen = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).id;
        if (e.isIntersecting && !seen.has(id)) {
          seen.add(id);
          track('section_view', { section: id });
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.4 },
  );
  document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));

  document.addEventListener('click', (e) => {
    const el = (e.target as Element).closest('a, button');
    if (!el) return;
    const href = el.getAttribute('href') || '';
    const where = el.getAttribute('data-track') || el.closest('[id]')?.id || '';
    if (href.startsWith('tel:')) track('call_click', { where });
    else if (href.includes('wa.me/')) track('whatsapp_click', { where });
    else if (el.hasAttribute('data-open-lead')) track('cta_click', { intent: el.getAttribute('data-intent') || 'site_visit', where });
  }, { capture: true, passive: true });
}
