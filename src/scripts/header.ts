// Sticky header (transparent → solid after 80px), scroll-spy and mobile menu.

import { $, $$, closeDialog, openDialog, setupDialog } from './lib';

export function initHeader() {
  const header = $('#site-header');
  if (!header) return;

  // Solid background after 80px — a sentinel avoids scroll listeners.
  const sentinel = $('#header-sentinel');
  if (sentinel) {
    new IntersectionObserver(([e]) => header.classList.toggle('is-solid', !e.isIntersecting)).observe(sentinel);
  }

  // Scroll-spy: mark the nav link whose section crosses the upper-middle of the viewport.
  const links = $$<HTMLAnchorElement>('[data-spy]');
  const byId = new Map<string, HTMLAnchorElement[]>();
  links.forEach((a) => {
    const id = a.hash.slice(1);
    byId.set(id, [...(byId.get(id) ?? []), a]);
  });
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.removeAttribute('aria-current'));
        byId.get(e.target.id)?.forEach((a) => a.setAttribute('aria-current', 'true'));
      }
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  byId.forEach((_v, id) => {
    const s = document.getElementById(id);
    if (s) spy.observe(s);
  });

  // Mobile full-screen menu (native modal dialog → focus trapped, ESC closes).
  const menu = $<HTMLDialogElement>('#mobile-menu');
  const toggle = $<HTMLButtonElement>('#menu-toggle');
  if (menu && toggle) {
    setupDialog(menu);
    toggle.addEventListener('click', () => {
      openDialog(menu, toggle);
      toggle.setAttribute('aria-expanded', 'true');
    });
    menu.addEventListener('close', () => toggle.setAttribute('aria-expanded', 'false'));
    // Close on link click — anchors scroll after the dialog closes; CTA buttons open the popup.
    menu.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a, [data-open-lead]')) closeDialog(menu);
    });
  }
}
