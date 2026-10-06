// Single entry for the landing page. Vite bundles + minifies these modules into
// one small hashed file under /_astro/. No framework, no third-party runtime.

import { onIdle } from './lib';
import { initTracking } from './tracking';
import { initAnalytics } from './analytics';
import { initConsentUI } from './consent-ui';
import { initHeader } from './header';
import { initLeadForms } from './lead-form';
import { initPopup } from './popup';
import { initReveal, initCounters } from './reveal';
import { initGallery } from './lightbox';
import { initVideos } from './youtube-facade';
import { initCarousel } from './carousel';
import { initLegal } from './legal';
import { initFloating, initMap } from './floating';
import { initCursor } from './cursor';
import { initVisitorTracking } from './visitor-tracking';

const safe = (fn: () => void) => {
  try { fn(); } catch (e) { console.error(e); }
};

// Critical UI first
[initHeader, initLeadForms, initPopup, initLegal, initConsentUI, initFloating, initReveal, initVisitorTracking].forEach(safe);
// Then everything below the fold and measurement
[initCounters, initGallery, initVideos, initCarousel, initMap, initTracking, initAnalytics].forEach(safe);
onIdle(() => safe(initCursor));
