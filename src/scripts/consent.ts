// Consent state (DPDP Act 2023). Stored in a first-party cookie for 180 days.
//   analytics → GA4 + raw IP storage server-side
//   marketing → Meta Pixel + Google Ads
// Nothing third-party loads until the relevant category is granted.

import { getCookie, setCookie } from './lib';

export type Consent = { analytics: boolean; marketing: boolean; t: number };
export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

const COOKIE = 'kyra_consent';
const listeners: ((c: Consent) => void)[] = [];

export function getConsent(): Consent | null {
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    return { analytics: !!c.analytics, marketing: !!c.marketing, t: +c.t || 0 };
  } catch {
    return null;
  }
}

export function consentStatus(): ConsentStatus {
  const c = getConsent();
  if (!c) return 'pending';
  return c.analytics || c.marketing ? 'accepted' : 'rejected';
}

export function setConsent(analytics: boolean, marketing: boolean, source: 'banner' | 'preferences' | 'lead_form') {
  const c: Consent = { analytics, marketing, t: Date.now() };
  setCookie(COOKIE, JSON.stringify(c), 180);
  listeners.forEach((fn) => fn(c));
  document.dispatchEvent(new CustomEvent('kyra:consent', { detail: c }));
  return { consent: c, source };
}

export function onConsent(fn: (c: Consent) => void) {
  listeners.push(fn);
}
