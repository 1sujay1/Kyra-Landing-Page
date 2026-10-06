// Consent banner + "Cookie preferences" modal. Syncs the choice to /api/consent.php
// so the server knows whether it may keep the raw IP for this visitor.

import { $, closeDialog } from './lib';
import { getConsent, onConsent, setConsent, type Consent } from './consent';
import { ids } from './tracking';

function sync(c: Consent, source: string) {
  const body = JSON.stringify({
    visitor_id: ids.visitor,
    status: c.analytics || c.marketing ? 'accepted' : 'rejected',
    analytics: c.analytics,
    marketing: c.marketing,
    source,
  });
  fetch('/api/consent.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
}

export function initConsentUI() {
  const banner = $('#consent-banner');
  if (banner) banner.hidden = true;
  banner?.setAttribute('hidden', '');

  const decide = (a: boolean, m: boolean, source: 'banner' | 'preferences') => {
    const { consent } = setConsent(a, m, source);
    sync(consent, source);
  };

  onConsent(hideBanner);
  // Lead-form consent is recorded by lead.php itself; here we only hide the banner.

  $('[data-consent-accept]')?.addEventListener('click', () => decide(true, true, 'banner'));
  $('[data-consent-reject]')?.addEventListener('click', () => decide(false, false, 'banner'));

  // Reflect current state each time the preferences modal opens
  prefs?.addEventListener('toggle', () => {
    if (!prefs.open) return;
    const c = getConsent();
    if (analytics) analytics.checked = !!c?.analytics;
    if (marketing) marketing.checked = !!c?.marketing;
  });
  $('[data-consent-save]')?.addEventListener('click', () => {
    decide(!!analytics?.checked, !!marketing?.checked, 'preferences');
    if (prefs) closeDialog(prefs);
  });
  $('[data-consent-accept-all]')?.addEventListener('click', () => {
    decide(true, true, 'preferences');
    if (prefs) closeDialog(prefs);
  });
}
