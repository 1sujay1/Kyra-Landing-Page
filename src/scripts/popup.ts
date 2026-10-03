// Lead popup: opened by any [data-open-lead] button (with data-intent), plus one
// automatic open per session (25 s, 50 % scroll or desktop exit intent).

import { $, openDialog, openDialogs, setupDialog, store } from './lib';
import { track } from './tracking';
import { formState, resetLeadForm } from './lead-form';

export type Intent = 'site_visit' | 'price' | 'brochure' | 'callback';

const copy: Record<Intent, { title: string; sub: string; cta: string }> = {
  site_visit: {
    title: 'Book a free site visit',
    sub: 'Free pickup from Coimbatore. Pick a date and we will confirm the slot by phone.',
    cta: 'Book my site visit',
  },
  price: {
    title: 'Get price details',
    sub: 'Share your number and we will send the latest price list and available plots.',
    cta: 'Send me the prices',
  },
  brochure: {
    title: 'Download the brochure',
    sub: 'Get the project brochure with plot layout, photos and location map.',
    cta: 'Get the brochure',
  },
  callback: {
    title: 'Talk to our team',
    sub: 'Leave your number and we will call you back within 30 minutes during working hours.',
    cta: 'Request a call back',
  },
};

const AUTO_KEY = 'kyra_auto_popup';

export function initPopup() {
  const dlg = $<HTMLDialogElement>('#lead-popup');
  if (!dlg) return;
  setupDialog(dlg);
  const wrap = $('[data-lead-wrap]', dlg)!;

  const open = (intent: Intent, trigger: string, opener?: Element | null) => {
    if (dlg.open) return;
    const c = copy[intent] ?? copy.site_visit;
    resetLeadForm(wrap);
    $('[data-popup-title]', dlg)!.textContent = c.title;
    $('[data-popup-sub]', dlg)!.textContent = c.sub;
    $('[data-label]', dlg)!.textContent = c.cta;
    ($('input[name=intent]', dlg) as HTMLInputElement).value = intent;
    openDialog(dlg, opener);
    track('popup_open', { intent, trigger });
  };

  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-open-lead]');
    if (!btn) return;
    e.preventDefault();
    open((btn.dataset.intent as Intent) || 'site_visit', 'cta', btn);
  });

  // ─── Automatic open, at most once per session, never after a lead ─────────
  const canAuto = () => !store.get(AUTO_KEY, true) && !store.get('kyra_lead_submitted');
  if (!canAuto()) return;

  let done = false;
  let retrying = false;
  const tryAuto = (trigger: string, retry = false) => {
    if (done || !canAuto() || (retrying && !retry)) return;
    // Never interrupt someone typing or another open dialog/menu — retry shortly.
    if (formState.active || openDialogs()) {
      retrying = true;
      setTimeout(() => tryAuto(trigger, true), 4000);
      return;
    }
    done = true;
    store.set(AUTO_KEY, '1', true);
    cleanup();
    open('site_visit', trigger);
  };

  const timer = setTimeout(() => tryAuto('timer_25s'), 25000);
  const onScroll = () => {
    const h = document.documentElement;
    if ((h.scrollTop + innerHeight) / h.scrollHeight >= 0.5) tryAuto('scroll_50');
  };
  const onLeave = (e: MouseEvent) => {
    if (!e.relatedTarget && e.clientY <= 0) tryAuto('exit_intent');
  };
  const cleanup = () => {
    clearTimeout(timer);
    removeEventListener('scroll', onScroll);
    document.documentElement.removeEventListener('mouseleave', onLeave);
  };

  addEventListener('scroll', onScroll, { passive: true });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.documentElement.addEventListener('mouseleave', onLeave);
  }
  document.addEventListener('kyra:lead-success', cleanup);
}
