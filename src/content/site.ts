// ─────────────────────────────────────────────────────────────────────────────
// Site-wide, PUBLIC settings. Everything here ships to the browser — never put a
// secret (Supabase service key, CAPI token, API tokens) in this file.
// Search the repo for [VERIFY] / [REPLACE] before launch.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  name: 'Kyra Group',
  legalName: 'Kyra Group', // [REPLACE] registered company name
  url: 'https://kyragroupindia.com', // [VERIFY] final domain (also astro.config.mjs, robots.txt, .htaccess)
  title: 'Farmland for Sale near Coimbatore & Pollachi | Kyra Group', // [VERIFY]
  description:
    'Clear-title farmland plots near Pollachi, Coimbatore with road access, water and fencing. Book a free site visit with pickup this weekend.',
  locale: 'en_IN',

  // Contact — [VERIFY] all of these with the client
  phoneDisplay: '+91 90872 66613',
  phone: '+919087266613',
  whatsapp: '919087266613', // digits only, with country code
  whatsappText: 'Hi, I am interested in farmland plots near Coimbatore',
  email: 'admin@kyragroupindia.com',
  address: {
    street: 'Door no. and street', // [REPLACE]
    locality: 'Sundarapuram',
    city: 'Coimbatore',
    region: 'Tamil Nadu',
    postalCode: '641024', // [VERIFY]
    country: 'IN',
  },
  geo: { lat: 10.9601, lng: 76.9729 }, // [VERIFY] office coordinates
  hours: 'Monday to Saturday, 9:30 am – 6:30 pm', // [VERIFY]
  hoursSchema: 'Mo-Sa 09:30-18:30', // [VERIFY]
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Sundarapuram%2C+Coimbatore', // [REPLACE] exact office pin
  // Google Maps embed for the project location. "output=embed" works without an API key.
  mapEmbedUrl: 'https://www.google.com/maps?q=Pollachi,+Tamil+Nadu&z=11&output=embed', // [REPLACE] project pin

  socials: {
    facebook: 'https://www.facebook.com/share/1JM732Hnx7/', // [VERIFY]
    instagram: 'https://www.instagram.com/kyra_group', // [VERIFY]
    youtube: 'https://youtube.com/@kyragroup-i7i', // [VERIFY]
    linkedin: 'https://www.linkedin.com/company/kyragroup', // [VERIFY]
  },

  // Public tracking IDs (safe in the browser). Leave '' to disable a tag.
  tracking: {
    metaPixelId: '1733697694744614', // [VERIFY] pixel currently on kyragroupindia.com
    ga4Id: '', // [REPLACE] e.g. 'G-XXXXXXXXXX'
    googleAdsId: '', // [REPLACE] e.g. 'AW-1234567890'
    googleAdsLeadLabel: '', // [REPLACE] conversion label, e.g. 'AbCdEfGhIjk'
  },

  // Brochure link revealed after a brochure-intent lead is submitted.
  brochureUrl: '/brochure/kyra-farmland-brochure.pdf', // [REPLACE] upload the PDF to public/brochure/
};

export const trust = [
  { value: '10+ years', label: 'in land development' }, // [VERIFY] founded 2016 per current site
  { value: '1,000+', label: 'happy customers' }, // [VERIFY]
  { value: 'Clear title', label: 'documents verified' }, // [VERIFY] approvals / documentation status
];

export const counters = [
  { value: 10, suffix: '+', label: 'Years of experience' }, // [VERIFY]
  { value: 148, suffix: '+', label: 'Acres developed' }, // [VERIFY] current site says 148 acres delivered
  { value: 1000, suffix: '+', label: 'Happy customers' }, // [VERIFY]
  { value: 15, suffix: '+', label: 'Projects' }, // [VERIFY] current site lists 15+
];

export type HighlightIcon = 'document' | 'road' | 'water' | 'fence' | 'climate' | 'register';

export const highlights: { icon: HighlightIcon; title: string; text: string; wide?: boolean }[] = [
  { icon: 'document', title: 'Clear title documents', text: 'Every plot is checked for a clean, registrable title before we list it. You get copies to review with your own lawyer.', wide: true }, // [VERIFY]
  { icon: 'road', title: 'Road access to every plot', text: 'Motorable roads right up to each plot boundary.' }, // [VERIFY]
  { icon: 'water', title: 'Water source / borewell', text: 'Reliable groundwater with borewell provision on site.' }, // [VERIFY]
  { icon: 'fence', title: 'Fenced boundary with gate', text: 'Secured perimeter fencing and a gated entrance.' }, // [VERIFY]
  { icon: 'climate', title: 'Pleasant climate near the Western Ghats', text: 'Cool breeze off the hills, fertile red soil and greenery through the year.', wide: true },
  { icon: 'register', title: 'Easy registration support', text: 'We handle the paperwork and stay with you on registration day.' },
];

export const distances = [
  { place: 'Coimbatore city', distance: '35 km', time: '50 min' }, // [VERIFY]
  { place: 'Pollachi town', distance: '8 km', time: '15 min' }, // [VERIFY]
  { place: 'Coimbatore airport', distance: '45 km', time: '1 hr' }, // [VERIFY]
  { place: 'NH 83 (Coimbatore – Pollachi)', distance: '3 km', time: '5 min' }, // [VERIFY]
];

// Lead form options. `value` is what the server accepts —
// keep in sync with BUDGETS in public/api/lib/validate.php.
export const budgets = [
  { value: 'under_10l', label: 'Under ₹10 lakh' },
  { value: '10_25l', label: '₹10 – 25 lakh' },
  { value: '25_50l', label: '₹25 – 50 lakh' },
  { value: '50l_plus', label: '₹50 lakh and above' },
]; // [VERIFY] ranges

// Exact consent text shown next to the checkbox and stored with every lead.
// The server stores its own copy (CONSENT_TEXT in public/api/lib/validate.php) — keep both identical.
export const consentText =
  'I agree to be contacted by Kyra Group via call, SMS and WhatsApp about this enquiry. I have read the Privacy Policy.';

export const nav = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#highlights', label: 'Highlights' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#videos', label: 'Videos' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' },
];

export const whatsappLink = (text = site.whatsappText) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
