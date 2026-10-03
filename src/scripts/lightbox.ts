// Gallery filter tabs + lightbox (arrow keys, swipe, ESC, "3 / 12" counter).

import { $, $$, openDialog, setupDialog } from './lib';

export function initGallery() {
  const root = $('#gallery');
  const dlg = $<HTMLDialogElement>('#lightbox');
  if (!root || !dlg) return;
  setupDialog(dlg);

  const items = $$<HTMLButtonElement>('.g-item', root);
  const tabs = $$<HTMLButtonElement>('.filter-tab', root);
  const img = $<HTMLImageElement>('img', dlg)!;
  const cap = $('[data-lb-caption]', dlg)!;
  const count = $('[data-lb-count]', dlg)!;
  let visible = items;
  let index = 0;

  // Filters
  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      const f = tab.dataset.filter!;
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
      items.forEach((it) => (it.parentElement!.hidden = f !== 'all' && it.dataset.category !== f));
      visible = items.filter((it) => !it.parentElement!.hidden);
      $('[data-gallery-status]', root)!.textContent = `${visible.length} photos shown`;
    }),
  );

  const show = (i: number) => {
    index = (i + visible.length) % visible.length;
    const it = visible[index];
    img.src = it.dataset.full!;
    img.alt = it.dataset.alt!;
    cap.textContent = it.dataset.caption!;
    count.textContent = `${index + 1} / ${visible.length}`;
    // Preload neighbours for instant arrows / swipes
    [index + 1, index - 1].forEach((n) => {
      const nb = visible[(n + visible.length) % visible.length];
      if (nb) new Image().src = nb.dataset.full!;
    });
  };

  items.forEach((it) =>
    it.addEventListener('click', () => {
      show(visible.indexOf(it));
      openDialog(dlg, it);
    }),
  );
  $('[data-lb-prev]', dlg)!.addEventListener('click', () => show(index - 1));
  $('[data-lb-next]', dlg)!.addEventListener('click', () => show(index + 1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });

  // Swipe
  let x0: number | null = null;
  dlg.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  dlg.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
  });
  // Tapping the dark area around the image closes the lightbox.
  dlg.addEventListener('click', (e) => {
    if ((e.target as Element).matches('[data-lb-stage]')) dlg.close();
  });
}
