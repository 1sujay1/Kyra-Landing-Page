// Copies the self-hosted woff2 files from Fontsource into /public/fonts.
// Run once after `npm install` (or whenever you upgrade the font packages): npm run fonts
import { copyFileSync, mkdirSync } from 'node:fs';

const files = [
  ['@fontsource/marcellus/files/marcellus-latin-400-normal.woff2', 'marcellus-latin-400.woff2'],
  ['@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'manrope-latin-variable.woff2'],
  ['@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-500-normal.woff2', 'noto-sans-tamil-500.woff2'],
];

mkdirSync('public/fonts', { recursive: true });
for (const [from, to] of files) {
  copyFileSync(`node_modules/${from}`, `public/fonts/${to}`);
  console.log(`fonts: ${to}`);
}
