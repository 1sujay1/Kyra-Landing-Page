// Consent-gated third-party tags: Meta Pixel, GA4, Google Ads.
// Stubs (fbq/gtag) are created as soon as consent exists so events queue up;
// the actual vendor scripts are injected when the browser is idle.

import { site } from '../content/site';
import { getConsent, onConsent, type Consent } from './consent';
import { onIdle } from './lib';

declare global {
  interface Window {
    fbq?: any; _fbq?: any;
    dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void;
  }
}

const { metaPixelId, ga4Id, googleAdsId, googleAdsLeadLabel } = site.tracking;
let metaOn = false;
let gtagOn = false;

function inject(src: string) {
  onIdle(() => {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  });
}

function startMeta() {
  if (metaOn || !metaPixelId) return;
  metaOn = true;
  const n: any = function (...args: unknown[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  };
  window.fbq = window._fbq = n;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  window.fbq('init', metaPixelId);
  window.fbq('track', 'PageView');
  inject('https://connect.facebook.net/en_US/fbevents.js');
}

function startGtag(c: Consent) {
  const ids = [c.analytics && ga4Id, c.marketing && googleAdsId].filter(Boolean) as string[];
  if (!ids.length) return;
  if (!gtagOn) {
    gtagOn = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); }; // gtag requires the arguments object
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.gtag('js', new Date());
    inject(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`);
  }
  const g = (on: boolean) => (on ? 'granted' : 'denied');
  window.gtag!('consent', 'update', {
    analytics_storage: g(c.analytics),
    ad_storage: g(c.marketing), ad_user_data: g(c.marketing), ad_personalization: g(c.marketing),
  });
  for (const id of ids) window.gtag!('config', id);
}

function apply(c: Consent) {
  if (c.marketing) startMeta();
  startGtag(c);
}

export function initAnalytics() {
  const c = getConsent();
  if (c) apply(c);
  onConsent(apply);
}

/** Fire only after the server confirmed the lead. eventId de-duplicates with Meta CAPI. */
export function fireLeadConversion(eventId: string, intent: string) {
  const c = getConsent();
  if (!c) return;
  if (c.marketing && window.fbq) window.fbq('track', 'Lead', { content_name: intent }, { eventID: eventId });
  if (window.gtag) {
    if (c.marketing && googleAdsId && googleAdsLeadLabel)
      window.gtag('event', 'conversion', { send_to: `${googleAdsId}/${googleAdsLeadLabel}`, transaction_id: eventId });
    if (c.analytics && ga4Id) window.gtag('event', 'generate_lead', { lead_source: intent });
  }
}
