// Fails the build if anything that looks like a server secret ended up in dist/.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const patterns = [
  /service_role/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*['"]?\s*=>\s*['"][^'"]+/,
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  /eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, // JWTs
  /EAA[A-Za-z0-9]{40,}/,                               // Meta access tokens
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
];
const skipExt = /\.(avif|webp|jpe?g|png|gif|woff2?|ico|mmdb)$/i;
let bad = 0;
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (skipExt.test(f)) continue;
    const text = readFileSync(p, 'utf8');
    for (const re of patterns) {
      // The PHP code legitimately references the config *key name*; only flag values.
      if (re.source === 'service_role' && p.endsWith('.php')) continue;
      if (re.test(text)) { console.error(`SECRET? ${p} matches ${re}`); bad++; }
    }
  }
})('dist');
if (bad) { console.error(`audit-secrets: ${bad} suspicious match(es) — fix before uploading.`); process.exit(1); }
console.log('audit-secrets: dist/ is clean');
