// Custom cursor — desktop with a fine pointer only; off for touch and reduced motion.
// Dot follows the pointer exactly, the ring trails it (lerp) via rAF + translate3d.

export function initCursor() {
  const ok = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ok) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  const label = document.createElement('span');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  ring.append(label);
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor', 'cursor-hidden');

  let mx = -100, my = -100, rx = -100, ry = -100;
  let raf = 0;

  const loop = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    raf = Math.abs(mx - rx) + Math.abs(my - ry) > 0.1 ? requestAnimationFrame(loop) : 0;
  };

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    document.documentElement.classList.remove('cursor-hidden');
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => document.documentElement.classList.add('cursor-hidden'));

  // Hover states: "View" on gallery, "Play" on videos, grow on links/buttons.
  // Native cursor stays visible on form fields (see global.css), so hide ours there.
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const field = t.closest('input, textarea, select, iframe');
    const media = t.closest<HTMLElement>('[data-cursor]');
    const interactive = t.closest('a, button, [role="button"], summary, label');
    document.documentElement.classList.toggle('cursor-hidden', !!field);
    label.textContent = media?.dataset.cursor ?? '';
    ring.classList.toggle('has-label', !!media);
    ring.classList.toggle('is-hover', !media && !!interactive);
  });
}
