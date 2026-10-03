// Legal modals (Privacy, Disclaimer, Terms, Cookie preferences).
// Deep-linkable: /#privacy opens the Privacy Policy on load.

import { $, $$, closeDialog, openDialog, setupDialog } from './lib';

const MODALS = ['privacy', 'disclaimer', 'terms', 'cookies'];

export function initLegal() {
  const dialogs = new Map<string, HTMLDialogElement>();
  for (const key of MODALS) {
    const d = $<HTMLDialogElement>(`#modal-${key}`);
    if (!d) continue;
    setupDialog(d);
    dialogs.set(key, d);
    d.addEventListener('close', () => {
      if (location.hash === `#${key}`) history.replaceState(null, '', location.pathname + location.search);
    });
  }

  const openKey = (key: string, opener?: Element | null) => {
    const d = dialogs.get(key);
    if (!d) return false;
    // Opening a legal modal from inside another dialog (e.g. the popup's consent
    // checkbox) stacks on top — native dialogs support that.
    openDialog(d, opener);
    return true;
  };

  $$<HTMLAnchorElement>('a[data-legal]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const key = a.dataset.legal!;
      // Close other legal modals first so they never stack on each other
      dialogs.forEach((d, k) => k !== key && closeDialog(d));
      if (openKey(key, a)) history.replaceState(null, '', `#${key}`);
    }),
  );

  const fromHash = () => {
    const key = location.hash.slice(1);
    if (MODALS.includes(key)) openKey(key);
  };
  fromHash();
  addEventListener('hashchange', fromHash);
}
