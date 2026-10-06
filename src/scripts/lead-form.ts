// Lead forms: validation, bot checks, submission and success state.
// Conversions fire ONLY after the server confirms the lead (ok + leadId).

import { $, $$, store } from "./lib";
import { track } from "./tracking";
import { consentStatus, setConsent } from "./consent";
import { fireLeadConversion } from "./analytics";

export const formState = { active: false }; // true while a visitor is typing in any form

/** A user-safe message returned by the server (validation, rate limit). */
class ServerMessage extends Error {}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Rule = (v: string, el: Field) => string | "";

export const normalisePhone = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
};

const isoDate = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const rules: Record<string, Rule> = {
  name: (v) =>
    v.length < 2
      ? "Enter your full name"
      : v.length > 60
        ? "Name must be 60 characters or fewer"
        : !/^[\p{L}\p{M} .'-]+$/u.test(v)
          ? "Use letters and spaces only"
          : "",
  phone: (v) =>
    /^[6-9]\d{9}$/.test(normalisePhone(v))
      ? ""
      : "Enter a valid 10-digit mobile number",
  budget: (v) => (v ? "" : "Choose your budget"),
  visit_date: (v, el) => {
    if (!v) return "";
    const { min, max } = el as HTMLInputElement;
    return v < min || v > max ? "Choose a date within the next 30 days" : "";
  },
  message: (v) =>
    v.length > 1000 ? "Message must be 1000 characters or fewer" : "",
};

function setError(el: Field, msg: string) {
  const err = document.getElementById(
    el.getAttribute("aria-describedby")?.split(" ")[0] || "",
  );
  el.setAttribute("aria-invalid", msg ? "true" : "false");
  if (err) err.textContent = msg;
}

function validateField(el: Field) {
  const rule = rules[el.name];
  if (!rule) return true;
  const msg = rule(el.value.trim(), el);
  setError(el, msg);
  return !msg;
}

function setDateBounds(form: HTMLFormElement) {
  const date = form.elements.namedItem("visit_date") as HTMLInputElement | null;
  if (!date) return;
  const today = new Date();
  const max = new Date(today.getTime() + 30 * 86400000);
  date.min = isoDate(today);
  date.max = isoDate(max);
}

function showSuccess(wrap: HTMLElement, name: string, intent: string) {
  const form = $("form", wrap)!;
  const ok = $("[data-lead-success]", wrap)!;
  $$("[data-name]", ok).forEach((n) => (n.textContent = name.split(" ")[0]));
  $("[data-brochure]", ok)?.toggleAttribute("hidden", intent !== "brochure");
  const wa = $<HTMLAnchorElement>("[data-success-wa]", ok);
  if (wa) {
    const u = new URL(wa.href);
    u.searchParams.set(
      "text",
      `Hi, I am ${name}. I just enquired about farmland plots near Coimbatore.`,
    );
    wa.href = u.toString();
  }
  form.hidden = true;
  ok.hidden = false;
  $<HTMLElement>("[data-success-title]", ok)?.focus();
}

function getCrmBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).CRM_BASE_URL) {
    return String((window as any).CRM_BASE_URL);
  }
  const envUrl = import.meta.env.PUBLIC_CRM_BASE_URL || 'https://crm.kyragroupindia.com';
  if (typeof window !== 'undefined') {
    const host = location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalhost && envUrl.includes('localhost')) {
      return 'https://crm.kyragroupindia.com';
    }
  }
  return envUrl;
}

async function submit(form: HTMLFormElement, wrap: HTMLElement) {
  console.log('🚀 [Submit Step 1] Lead form submit handler triggered.', { formId: form.dataset.form, wrap });

  const fields = $$<Field>('input, select, textarea', form).filter((f) => rules[f.name]);
  const firstBad = fields.filter((f) => !validateField(f))[0]; // validate all, focus the first
  form.dataset.submitted = '1';

  if (firstBad) {
    console.warn('⚠️ [Submit Step 2] Validation failed on field:', firstBad.name);
    firstBad.focus();
    return;
  }
  console.log('✅ [Submit Step 2] Form validation passed for all fields.');

  const btn = $<HTMLButtonElement>('button[type=submit]', form)!;
  const label = $('[data-label]', btn)!;
  const status = $('[data-status]', form)!;
  const idle = label?.textContent || 'Book my site visit';
  const fd = new FormData(form);
  const get = (k: string) => String(fd.get(k) ?? '').trim();
  const intent = get('intent') || 'site_visit';

  console.log('⚙️ [Submit Step 3] Setting button to disabled & Submitting...');
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
  }
  if (label) label.textContent = 'Submitting...';
  if (status) status.textContent = '';

  const crmBaseUrl = getCrmBaseUrl().replace(/\/+$/, '');
  const landingLeadApi = `${crmBaseUrl}/api/leads/landing`;

  console.log('🌐 [Submit Step 4] Target CRM Endpoint:', { crmBaseUrl, landingLeadApi, hostname: typeof location !== 'undefined' ? location.hostname : '' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    console.warn('⏰ [Submit Timeout] 30s abort controller timer fired.');
    ctrl.abort();
  }, 30000);

  try {
    const geoData = (typeof window !== 'undefined' && window.__kyraGeoData) ? window.__kyraGeoData : {};

    const payload = {
      full_name: get('name'),
      name: get('name'),
      phone: normalisePhone(get('phone')),
      mobile: normalisePhone(get('phone')),
      email: get('email'),
      project_name: 'Kyra Farmlands',
      project: 'KYRA_FARMLANDS',
      source: 'contact_form',
      campaign_name: 'Landing Page Enquiry',
      budget_range: get('budget') || '₹35L - ₹50L',
      purpose: 'farmhouse',
      message: get('message') || '',
      intent,
      visit_date: get('visit_date') || null,
      page_url: typeof location !== 'undefined' ? location.href.slice(0, 500) : '',
      ip: geoData.ip || '',
      city: geoData.city || 'Coimbatore',
      region: geoData.region || 'Tamil Nadu',
      country: geoData.country_name || 'India',
    };

    console.log('📦 [Submit Step 5] Sending JSON payload:', payload);

    let res: Response;
    try {
      console.log('📡 [Submit Step 6] Executing primary fetch call to:', landingLeadApi);
      res = await fetch(landingLeadApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        signal: ctrl.signal,
        body: JSON.stringify(payload),
      });
      console.log('✅ [Submit Step 7] Primary fetch response received:', { status: res.status, ok: res.ok, statusText: res.statusText });
    } catch (firstErr) {
      console.warn('⚠️ [Submit Step 7-Retry] Primary fetch caught error, executing 15s retry fetch:', firstErr);
      const retryCtrl = new AbortController();
      const retryTimer = setTimeout(() => {
        console.warn('⏰ [Submit Retry Timeout] 15s retry timer fired.');
        retryCtrl.abort();
      }, 15000);
      try {
        res = await fetch(landingLeadApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit',
          signal: retryCtrl.signal,
          body: JSON.stringify(payload),
        });
        console.log('✅ [Submit Step 7-Retry] Retry fetch response received:', { status: res.status, ok: res.ok, statusText: res.statusText });
      } catch (secondErr) {
        console.error('❌ [Submit Step 7-Retry] Retry fetch also failed with error:', secondErr);
        throw secondErr;
      } finally {
        clearTimeout(retryTimer);
      }
    }

    const data = await res.json().catch((jsonErr) => {
      console.warn('⚠️ [Submit Step 8] Failed to parse response body as JSON:', jsonErr);
      return {};
    });

    console.log('📄 [Submit Step 8] Response data JSON parsed:', data);

    if (!res.ok || data.success === false || data.ok === false) {
      const msg = data.message || data.error || `Server responded with status ${res.status}. Please try again.`;
      console.error('❌ [Submit Step 9 ERROR] Server rejected lead submission:', msg);
      throw new ServerMessage(msg);
    }

    console.log('🎉 [Submit Step 9 SUCCESS] Lead successfully confirmed by CRM backend!', { status: res.status, data });

    if (consentStatus() === 'pending') setConsent(true, true, 'lead_form');
    if (data.leadId && data.eventId) fireLeadConversion(data.eventId, intent);

    store.set('kyra_lead_submitted', '1');
    document.dispatchEvent(new CustomEvent('kyra:lead-success', { detail: { intent } }));
    showSuccess(wrap, get('name'), intent);
  } catch (err) {
    console.error('💥 [Submit Step CATCH] Exception caught in submit handler:', {
      endpoint: landingLeadApi,
      error: err,
      name: (err as any)?.name,
      message: (err as any)?.message,
      stack: (err as any)?.stack,
    });
    if (status) {
      if (err instanceof ServerMessage) {
        status.textContent = err.message;
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        status.textContent = `Request timed out. Please check if CRM server is responding.`;
      } else if (err instanceof TypeError) {
        status.textContent = `Unable to connect to CRM backend at ${crmBaseUrl}. Please check your connection or call us directly.`;
      } else {
        status.textContent = 'Submission failed. Please check your connection or call us directly.';
      }
    }
  } finally {
    console.log('🏁 [Submit Step FINALLY] Restoring submit button state & clearing timer.');
    clearTimeout(timer);
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
    if (label) label.textContent = idle;
  }
}

export function initLeadForms() {
  for (const wrap of $$("[data-lead-wrap]")) {
    const form = $<HTMLFormElement>("form", wrap)!;
    if (form.dataset.wired) continue;
    form.dataset.wired = "1";
    setDateBounds(form);

    form.addEventListener("focusin", () => {
      formState.active = true;
      if (!form.dataset.startedAt) {
        form.dataset.startedAt = String(Date.now());
        track("form_start", {
          form: form.dataset.form,
          intent: (form.elements.namedItem("intent") as HTMLInputElement)
            ?.value,
        });
      }
    });
    form.addEventListener("focusout", () =>
      setTimeout(() => {
        formState.active = !!document.activeElement?.closest("form");
      }, 0),
    );

    // Live re-validation after the first submit attempt, or once a field was touched.
    form.addEventListener("input", (e) => {
      const el = e.target as Field;
      if (el.name === "phone")
        el.value = el.value.replace(/[^\d+ -]/g, "").slice(0, 15);
      if (form.dataset.submitted || el.getAttribute("aria-invalid") === "true")
        validateField(el);
    });
    form.addEventListener("change", (e) => {
      const el = e.target as Field;
      if (form.dataset.submitted || el.type === "checkbox") validateField(el);
    });
    form.addEventListener("focusout", (e) => {
      const el = e.target as Field;
      if (el.value && rules[el.name]) validateField(el);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit(form, wrap);
    });
  }
}

/** Reset a form back to its empty state (used when the popup re-opens after success). */
export function resetLeadForm(wrap: HTMLElement) {
  const form = $<HTMLFormElement>("form", wrap)!;
  const ok = $("[data-lead-success]", wrap)!;
  if (!ok.hidden) {
    form.reset();
    delete form.dataset.submitted;
    delete form.dataset.startedAt;
    $$<Field>("[aria-invalid]", form).forEach((f) => setError(f, ""));
    form.hidden = false;
    ok.hidden = true;
  }
}
