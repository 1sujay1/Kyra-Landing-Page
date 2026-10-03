// Small shared helpers for all page scripts.

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setCookie(name: string, value: string, days: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`;
}

export const store = {
  get(k: string, session = false) {
    try { return (session ? sessionStorage : localStorage).getItem(k); } catch { return null; }
  },
  set(k: string, v: string, session = false) {
    try { (session ? sessionStorage : localStorage).setItem(k, v); } catch { /* private mode */ }
  },
};

export const uuid = () =>
  crypto.randomUUID?.() ??
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
  );

export const onIdle = (fn: () => void, timeout = 2500) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 1200);

// ─── Dialogs ────────────────────────────────────────────────────────────────
// Native <dialog>.showModal() gives us an inert background (focus trap), ESC to
// close and a top layer. We add scroll lock, outside-tap close and focus return.

const returnFocus = new WeakMap<HTMLDialogElement, Element | null>();

export const openDialogs = () => document.querySelectorAll('dialog[open]').length;

export function openDialog(dlg: HTMLDialogElement, opener?: Element | null) {
  if (dlg.open) return;
  returnFocus.set(dlg, opener ?? document.activeElement);
  dlg.showModal();
  document.documentElement.classList.add('scroll-locked');
  document.dispatchEvent(new CustomEvent('kyra:dialog', { detail: { open: true, id: dlg.id } }));
}

export function closeDialog(dlg: HTMLDialogElement) {
  if (dlg.open) dlg.close();
}

/** Wire common behaviour once per dialog: close buttons, backdrop tap, cleanup. */
export function setupDialog(dlg: HTMLDialogElement) {
  if (dlg.dataset.wired) return;
  dlg.dataset.wired = '1';
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeDialog(dlg); // tap on the backdrop
    if ((e.target as Element).closest('[data-close]')) closeDialog(dlg);
  });
  dlg.addEventListener('close', () => {
    if (!openDialogs()) document.documentElement.classList.remove('scroll-locked');
    const el = returnFocus.get(dlg) as HTMLElement | null;
    if (el && document.contains(el)) el.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('kyra:dialog', { detail: { open: false, id: dlg.id } }));
  });
}
