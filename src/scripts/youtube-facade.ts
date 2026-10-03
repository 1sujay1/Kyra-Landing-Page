// YouTube facade: thumbnail + play button; the iframe (youtube-nocookie.com)
// is only created on click. Thumbnails swap into the featured slot.

import { $, $$ } from './lib';
import { track } from './tracking';

const isPlaceholder = (id: string) => !id || id.startsWith('REPLACE');

function play(facade: HTMLElement) {
  const id = facade.dataset.id!;
  if (isPlaceholder(id)) return;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  iframe.title = facade.dataset.title || 'YouTube video';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  facade.replaceChildren(iframe);
  facade.removeAttribute('role');
  iframe.focus();
  track('video_play', { id, title: facade.dataset.title });
}

export function initVideos() {
  // Any facade on the page (featured video, testimonial videos)
  document.addEventListener('click', (e) => {
    const f = (e.target as Element).closest<HTMLElement>('[data-yt]');
    if (f && f.querySelector('.play-btn')) play(f);
  });

  const featured = $('#featured-video');
  if (!featured) return;
  const thumbs = $$<HTMLButtonElement>('[data-thumb]');
  thumbs.forEach((t) =>
    t.addEventListener('click', () => {
      // Swap data between featured slot and the clicked thumbnail.
      const cur = { id: featured.dataset.id!, title: featured.dataset.title!, img: $<HTMLImageElement>('img', featured)?.src };
      const next = { id: t.dataset.id!, title: t.dataset.title!, img: $<HTMLImageElement>('img', t)!.src };
      const tpl = $<HTMLTemplateElement>('#featured-facade-tpl')!;
      const fresh = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const fImg = $<HTMLImageElement>('img', fresh)!;
      fImg.src = next.img;
      fImg.alt = '';
      $('[data-title]', fresh)!.textContent = next.title;
      featured.replaceChildren(...fresh.childNodes);
      featured.setAttribute('role', 'button');
      featured.dataset.id = next.id;
      featured.dataset.title = next.title;
      featured.setAttribute('aria-label', `Play video: ${next.title}`);
      $('[data-featured-title]')!.textContent = next.title;

      if (cur.img) $<HTMLImageElement>('img', t)!.src = cur.img;
      t.dataset.id = cur.id;
      t.dataset.title = cur.title;
      $('[data-thumb-title]', t)!.textContent = cur.title;
      t.setAttribute('aria-label', `Show video: ${cur.title}`);
      // Auto-play the chosen video (user gesture already happened).
      play(featured);
      if (isPlaceholder(next.id)) featured.focus();
    }),
  );
  featured.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && featured.querySelector('.play-btn')) {
      e.preventDefault();
      play(featured);
    }
  });
}
