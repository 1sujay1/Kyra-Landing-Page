// Legal texts shown in modals (Privacy Policy, Disclaimer, Terms of Use).
// DRAFTS — the client must get these reviewed by a lawyer before launch.
// Each entry opens via its hash, e.g. https://kyragroupindia.com/#privacy
// Body is trusted HTML authored here (rendered with set:html) — do not paste user input.

import { site } from './site';

const grievance = {
  name: '[REPLACE: grievance officer name]',
  email: site.email, // [REPLACE] dedicated privacy / grievance email
  phone: site.phoneDisplay, // [REPLACE]
};

export const legal = {
  privacy: {
    title: 'Privacy Policy',
    updated: '[REPLACE: date]',
    body: `
<p><strong>Who we are.</strong> Kyra Group, [REPLACE: registered company name and address], operates this website.</p>
<p><strong>What we collect.</strong> Information you give us (name, mobile number, budget, visit date and message) and information collected automatically (IP address, approximate city-level location derived from the IP address, device and browser type, pages viewed, the ad campaign that brought you here, and cookies).</p>
<p><strong>Why we collect it.</strong> To respond to your enquiry, arrange site visits, share project information by call, SMS and WhatsApp, measure and improve our advertising, and prevent spam.</p>
<p><strong>Legal basis.</strong> Your consent, which you give through the cookie banner and the enquiry form. You can withdraw consent at any time through “Cookie preferences” in the footer or by writing to us.</p>
<p><strong>Location.</strong> Any location we derive from your IP address is approximate (city level). We never collect your precise location.</p>
<p><strong>Before you consent.</strong> Until you accept cookies we store only a one-way scrambled (hashed) form of your IP address, your approximate city, and the pages and campaign that brought you here. Advertising pixels are not loaded.</p>
<p><strong>Sharing.</strong> We do not sell your data. We share it only with service providers that help us run this website and our communication (hosting, database, messaging and advertising platforms such as Meta and Google), and with authorities when the law requires.</p>
<p><strong>Retention.</strong> Enquiry data is kept for up to [VERIFY: 24] months; raw IP addresses for up to [VERIFY: 180] days.</p>
<p><strong>Your rights.</strong> You can request access, correction or deletion of your data, or withdraw consent, by writing to ${grievance.name}, <a href="mailto:${grievance.email}">${grievance.email}</a>, ${grievance.phone}. We respond within [VERIFY: 30] days.</p>
<p><strong>Cookies.</strong> We use essential cookies to run the site and, with your consent, analytics and advertising cookies. Manage them through “Cookie preferences” in the footer.</p>
`,
  },
  disclaimer: {
    title: 'Disclaimer',
    updated: '[REPLACE: date]',
    body: `
<p>The images, videos, layouts, maps and descriptions on this website are for illustration only and may not represent the exact property. Distances and travel times are approximate. Prices, availability and specifications may change without notice.</p>
<p>Nothing on this website is an offer, a contract or a promise of returns or price appreciation. Buyers should independently verify title documents, approvals, land classification and all legal requirements before purchase.</p>
<p>[VERIFY: add RERA / DTCP registration numbers if applicable to any project, or state that the property is agricultural land not requiring such approval — client and legal advisor to confirm.]</p>
<p>Agricultural land purchase may be subject to state and central laws, including restrictions for NRIs. Kyra Group is not liable for decisions made solely on the basis of this website.</p>
`,
  },
  terms: {
    title: 'Terms of Use',
    updated: '[REPLACE: date]',
    body: `
<p>Use of this website is subject to these terms and the laws of India, with jurisdiction in the courts of Coimbatore.</p>
<p>All content on this website, including text, photographs, videos and logos, is owned by Kyra Group and may not be copied or reused without written permission.</p>
`,
  },
} as const;

export type LegalKey = keyof typeof legal;
