// Section fade-in (once) and animated counters. Both respect reduced motion.

import { $$, reducedMotion } from './lib';

export function initReveal() {
  const els = $$('.reveal');
  if (reducedMotion()) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

const fmt = new Intl.NumberFormat('en-IN');

export function initCounters() {
  const els = $$('[data-count]');
  const finish = (el: HTMLElement) => (el.textContent = fmt.format(+el.dataset.count!) + (el.dataset.suffix ?? ''));
  if (reducedMotion()) { els.forEach(finish); return; }

  const run = (el: HTMLElement) => {
    const target = +el.dataset.count!;
    const suffix = el.dataset.suffix ?? '';
    const dur = 1600;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); }
      }
    },
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}
