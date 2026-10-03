// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// [VERIFY] final production domain (also update public/robots.txt, public/.htaccess
// and ALLOWED_ORIGIN in /home/<user>/private/config.php).
const SITE = 'https://kyragroupindia.com';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always', // one small CSS file → inline it, no render-blocking request
    assets: '_astro',
  },
  image: {
    responsiveStyles: false,
  },
  prefetch: false,
  integrations: [sitemap()],
  vite: {
    // Cast: @tailwindcss/vite and Astro can resolve different Vite type copies.
    plugins: [/** @type {any} */ (tailwindcss())],
    build: { assetsInlineLimit: 0 },
  },
});
