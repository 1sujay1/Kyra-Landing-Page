// Legal texts shown in modals (Privacy Policy, Disclaimer, Terms of Use).
// DRAFTS — the client must get these reviewed by a lawyer before launch.
// Each entry opens via its hash, e.g. https://kyragroupindia.com/#privacy
// Body is trusted HTML authored here (rendered with set:html) — do not paste user input.

import { site } from './site';

const a = site.address;
const office = `${a.street}, ${a.locality}, ${a.city}, ${a.region} ${a.postalCode}`;

export const legal = {
  // DRAFT (client change request 11): written to India's Digital Personal Data Protection Act, 2023 and the
  // Information Technology Act, 2000. Final wording to be approved by Mr. Viswanathan.
  privacy: {
    title: 'Privacy Policy',
    updated: '31 October 2026',
    body: `
<p><strong>Who we are.</strong> This website (farmland.kyragroupindia.com) is run by Kyra Group, ${office} (“Kyra Group”, “we”, “us”). We decide how your personal data is used, so we are responsible for it under Indian law.</p>
<p><strong>What we collect.</strong> Details you give us (name, mobile number, budget, preferred visit date and message) and details collected automatically (IP address, approximate city-level location derived from the IP address, device and browser type, pages viewed, the ad campaign that brought you here, and cookies).</p>
<p><strong>Why we use it.</strong> To respond to your enquiry, arrange farm visits and pick-up, share project information by call, SMS and WhatsApp, measure and improve our advertising, keep the website secure and prevent spam. We use your data only for these purposes.</p>
<p><strong>Your consent.</strong> We use your data on the basis of your consent: the tick box on the enquiry form (to contact you) and your choice in the cookie banner (for analytics and advertising). You can withdraw consent at any time through “Cookie preferences” in the footer or by writing to us. Withdrawing does not affect anything we did before you withdrew.</p>
<p><strong>Before you consent.</strong> Until you accept cookies we store only a one-way scrambled (hashed) form of your IP address, your approximate city, and the pages and campaign that brought you here. Advertising pixels are not loaded.</p>
<p><strong>Location.</strong> Any location we derive from your IP address is approximate (city level). We never collect your precise location.</p>
<p><strong>Sharing.</strong> We do not sell your data. We share it only with service providers who help us run this website and contact you (hosting, our customer management system, messaging, and advertising platforms such as Meta and Google), under contracts that limit their use of it, and with authorities when the law requires.</p>
<p><strong>Transfers outside India.</strong> Some of these providers may store or process data on servers outside India, in countries to which such transfers are not restricted by the Government of India.</p>
<p><strong>How long we keep it.</strong> Enquiry details are kept for up to 24 months after our last contact with you, unless a purchase or the law needs us to keep them longer. Raw IP addresses are kept for up to 180 days. After that the data is deleted or anonymised.</p>
<p><strong>Security.</strong> We use reasonable security safeguards, including encrypted (HTTPS) connections, restricted access to enquiry data and hashed IP addresses.</p>
<p><strong>Your rights.</strong> You can ask for a summary of the data we hold about you, have it corrected, completed, updated or erased, withdraw consent, and nominate another person to exercise these rights if you die or become unable to. We respond within 30 days. If you are not satisfied with our reply, you can complain to the Data Protection Board of India.</p>
<p><strong>Grievance Officer.</strong> For any request or complaint, write to the Grievance Officer, Kyra Group, ${office}, or email <a href="mailto:${site.email}">${site.email}</a>.</p>
<p><strong>Children.</strong> This website is meant for adults. We do not knowingly collect data from anyone under 18.</p>
<p><strong>Cookies.</strong> We use essential cookies to run the website and, with your consent, analytics and advertising cookies. Manage them through “Cookie preferences” in the footer.</p>
<p><strong>Changes.</strong> We may update this policy. The date at the top shows the latest version.</p>
`,
  },
  disclaimer: {
    title: 'Disclaimer',
    updated: '31 October 2026',
    body: `
<p>The images, videos, layouts, maps and descriptions on this website are for illustration only and may not represent the exact property. Distances and travel times are approximate. Prices, availability and specifications may change without notice.</p>
<p>Nothing on this website is an offer, a contract or a promise of returns or price appreciation. Buyers should independently verify title documents, approvals, land classification and all legal requirements before purchase.</p>
<p>[VERIFY: add RERA / DTCP registration numbers if applicable to any project, or state that the property is agricultural land not requiring such approval — client and legal advisor to confirm.]</p>
<p>Agricultural land purchase may be subject to state and central laws, including restrictions for NRIs. Kyra Group is not liable for decisions made solely on the basis of this website.</p>
`,
  },
  terms: {
    title: 'Terms of Use',
    updated: '31 October 2026',
    body: `
<p>Use of this website is subject to these terms and the laws of India, with jurisdiction in the courts of Coimbatore.</p>
<p>All content on this website, including text, photographs, videos and logos, is owned by Kyra Group and may not be copied or reused without written permission.</p>
`,
  },
} as const;

export type LegalKey = keyof typeof legal;
