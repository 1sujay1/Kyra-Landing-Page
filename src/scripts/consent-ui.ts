// Consent UI handler: ensures consent banner remains hidden.

import { $, closeDialog } from './lib';
import { getConsent, setConsent, type Consent } from './consent';
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
  if (banner) {
    banner.hidden = true;
    banner.setAttribute('hidden', '');
  }

  const prefs = $<HTMLDialogElement>('#modal-cookies');
  const analytics = $<HTMLInputElement>('#pref-analytics');
  const marketing = $<HTMLInputElement>('#pref-marketing');

  const decide = (a: boolean, m: boolean, source: 'banner' | 'preferences') => {
    const { consent } = setConsent(a, m, source);
    sync(consent, source);
  };

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
