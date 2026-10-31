// ─────────────────────────────────────────────────────────────────────────────
// Site-wide, PUBLIC settings. Everything here ships to the browser — never put a
// secret (Supabase service key, CAPI token, API tokens) in this file.
// Search the repo for [VERIFY] / [REPLACE] before launch.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  name: 'Kyra Group',
  legalName: 'Kyra Group', // [REPLACE] registered company name
  url: 'https://farmland.kyragroupindia.com', // also astro.config.mjs, robots.txt, .htaccess
  title: 'Farmland for Sale near Coimbatore & Pollachi | Kyra Group', // [VERIFY]
  description:
    'Clear-title farms near Pollachi, 20 minutes from the Coimbatore – Pollachi highway, with water, fencing and a pleasant Western Ghats climate. Plan your farm visit with complimentary pick-up.',
  locale: 'en_IN',

  // Contact — [VERIFY] all of these with the client
  phoneDisplay: '+91 90872 66653',
  phone: '+919087266653',
  whatsapp: '919087266653', // digits only, with country code
  whatsappText: 'Hi, I am interested in farms near Coimbatore',
  email: 'admin@kyragroupindia.com',
  address: {
    street: 'Muthuplaza, 1st Floor, Sangam St',
    locality: 'Sundarapuram',
    city: 'Coimbatore',
    region: 'Tamil Nadu',
    postalCode: '641024', // [VERIFY]
    country: 'IN',
  },
  geo: { lat: 10.9601, lng: 76.9729 }, // [VERIFY] office coordinates
  hours: 'Monday to Saturday, 9:30 am – 6:30 pm', // [VERIFY]
  hoursSchema: 'Mo-Sa 09:30-18:30', // [VERIFY]
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Muthuplaza%2C+Sangam+St%2C+Sundarapuram%2C+Coimbatore+641024',
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

// Hero: two location facts and one trust line (client change request).
export const heroLocation = [
  '20 min drive from Coimbatore – Pollachi Highway',
  '150 metres from Pollachi – Palakkad SH',
];

export const trust = { years: '15+ years', customers: '500+' };

// About counters, as on kyragroupindia.com
export const counters = [
  { value: 500, suffix: '+', label: 'Happy customers' },
  { value: 15, suffix: '+', label: 'Years of experience' },
  { value: 1000, suffix: '+', label: 'Acres developed' },
];

export type HighlightIcon = 'document' | 'road' | 'water' | 'fence' | 'climate' | 'register';

export const highlights: { icon: HighlightIcon; title: string; text: string }[] = [
  { icon: 'document', title: 'Clear title documents', text: 'Every farm is checked for a clean, registrable title. You get copies to review with your own lawyer.' },
  { icon: 'water', title: 'Water source / borewell', text: 'Reliable groundwater with borewell provision on the farm.' },
  { icon: 'fence', title: 'Fenced boundary with gate', text: 'Secured perimeter fencing and a gated entrance.' },
  { icon: 'climate', title: 'Pleasant climate near the Western Ghats', text: 'Cool breeze off the hills, fertile red soil and greenery through the year.' },
];

export const distances = [
  { place: 'Coimbatore city', distance: '35 km', time: '40 min' },
  { place: 'Pollachi town', distance: '18 km', time: '20 min' },
  { place: 'Coimbatore airport', distance: '50 km', time: '60 min' },
  { place: 'NH 83 (Coimbatore – Pollachi)', distance: '15 km', time: '15 min' },
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
