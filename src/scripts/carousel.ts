// Testimonial carousel: native scroll-snap (swipe for free) + dots, arrows and
// autoplay that pauses on hover, focus, hidden tab and reduced motion.

import { $, $$, reducedMotion } from './lib';

export function initCarousel() {
  const root = $('[data-carousel]');
  if (!root) return;
  const track = $('.carousel-track', root)!;
  const slides = $$('.carousel-track > *', root);
  const dots = $$<HTMLButtonElement>('[data-dot]', root);
  let current = 0;

  const perView = () => Math.round(track.clientWidth / slides[0].clientWidth) || 1;
  const maxIndex = () => slides.length - perView();

  const go = (i: number) => {
    current = i > maxIndex() ? 0 : i < 0 ? maxIndex() : i;
    track.scrollTo({ left: slides[current].offsetLeft - track.offsetLeft, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  // Keep dots in sync with manual swipes/scrolls
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          current = slides.indexOf(e.target as HTMLElement);
          dots.forEach((d, i) => d.setAttribute('aria-current', String(i === current)));
          slides.forEach((s, i) => s.setAttribute('aria-hidden', String(i < current || i >= current + perView())));
        }
      }
    },
    { root: track, threshold: 0.6 },
  );
  slides.forEach((s) => io.observe(s));

  dots.forEach((d, i) => d.addEventListener('click', () => go(Math.min(i, maxIndex()))));
  $('[data-prev]', root)!.addEventListener('click', () => go(current - 1));
  $('[data-next]', root)!.addEventListener('click', () => go(current + 1));

  if (reducedMotion()) return;
  let paused = false;
  let visible = false;
  const pause = (p: boolean) => () => (paused = p);
  root.addEventListener('pointerenter', pause(true));
  root.addEventListener('pointerleave', pause(false));
  root.addEventListener('focusin', pause(true));
  root.addEventListener('focusout', pause(false));
  track.addEventListener('touchstart', pause(true), { passive: true });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(root);
  setInterval(() => {
    if (!paused && visible && !document.hidden) go(current + 1);
  }, 6000);
}
