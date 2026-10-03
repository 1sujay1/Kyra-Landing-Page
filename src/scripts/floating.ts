// Floating UI: back-to-top after 600px, hide the mobile sticky bar while a dialog
// is open, and lazy Google Map (facade until visible + consent, or on click).

import { $, openDialogs } from './lib';
import { getConsent, onConsent } from './consent';

export function initFloating() {
  const top = $('#back-to-top');
  const bar = $('#mobile-bar');
  const sentinel = $('#top-sentinel');
  if (top && sentinel) {
    new IntersectionObserver(([e]) => top.toggleAttribute('data-show', !e.isIntersecting)).observe(sentinel);
    top.addEventListener('click', () => scrollTo({ top: 0 }));
  }
  document.addEventListener('kyra:dialog', () => {
    const anyOpen = openDialogs() > 0;
    bar?.toggleAttribute('data-hidden', anyOpen);
    $('#floating-wa')?.toggleAttribute('data-hidden', anyOpen);
  });
}

export function initMap() {
  const box = $('#map-facade');
  if (!box) return;
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    const f = document.createElement('iframe');
    f.src = box.dataset.src!;
    f.title = 'Map showing the project location near Pollachi';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.className = 'absolute inset-0 h-full w-full border-0';
    box.replaceChildren(f);
  };
  box.querySelector('button')?.addEventListener('click', load);
  // Google Maps sets cookies, so auto-load only for visitors who accepted analytics.
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && getConsent()?.analytics) { load(); io.disconnect(); }
  }, { rootMargin: '200px' });
  io.observe(box);
  onConsent(() => { io.unobserve(box); io.observe(box); });
}
