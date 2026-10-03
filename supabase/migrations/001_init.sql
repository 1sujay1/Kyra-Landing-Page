-- ════════════════════════════════════════════════════════════════════════════
-- Kyra Group landing page — visitors, events and leads
-- Run in Supabase → SQL editor (Mumbai region project), or `supabase db push`.
--
-- Security model: RLS is ON for every table with NO policies for anon /
-- authenticated. Only the PHP backend (service-role / secret key) can read or
-- write. The CRM reads through its own authenticated, role-checked policies
-- (example at the bottom).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.visitors (
  id                 uuid primary key,                 -- visitor_id from the first-party cookie
  first_seen         timestamptz not null default now(),
  last_seen          timestamptz not null default now(),
  ip_hash            text not null,                    -- HMAC-SHA256(ip, IP_HASH_SALT)
  ip_raw             inet,                             -- only after consent
  ip_raw_at          timestamptz,                      -- when ip_raw was stored (retention clock)
  country            text,
  region             text,
  city               text,
  latitude           numeric(6, 2),                    -- approximate (city level)
  longitude          numeric(6, 2),
  device             text,
  browser            text,
  os                 text,
  first_utm          jsonb,
  last_utm           jsonb,
  consent_status     text not null default 'pending'
                     check (consent_status in ('pending', 'accepted', 'rejected')),
  consent_categories jsonb,
  consent_at         timestamptz,
  visit_count        int not null default 1
);

create table if not exists public.visitor_events (
  id          bigint generated always as identity primary key,
  visitor_id  uuid references public.visitors (id) on delete cascade,
  session_id  text,
  event_type  text not null check (event_type in (
                'page_view', 'section_view', 'cta_click', 'popup_open', 'form_start',
                'lead_submit', 'video_play', 'whatsapp_click', 'call_click', 'consent_update')),
  event_data  jsonb,
  page_url    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    uuid references public.visitors (id) on delete set null,
  name          text not null check (char_length(name) between 2 and 60),
  phone         text not null check (phone ~ '^[6-9][0-9]{9}$'),
  budget        text check (budget in ('under_10l', '10_25l', '25_50l', '50l_plus')),
  visit_date    date,
  message       text check (char_length(message) <= 1000),
  intent        text not null default 'site_visit'
                check (intent in ('site_visit', 'price', 'brochure', 'callback')),
  utm           jsonb,
  gclid         text,
  fbclid        text,
  city          text,
  region        text,
  page_url      text,
  consent_given boolean not null check (consent_given),
  consent_text  text not null,                         -- exact text shown to the visitor
  consent_at    timestamptz not null,
  status        text not null default 'new',           -- CRM pipeline: new | contacted | visit_booked | ...
  submissions   int not null default 1,                -- repeat enquiries within 24 h
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists visitor_events_visitor_created_idx on public.visitor_events (visitor_id, created_at);
create index if not exists visitor_events_type_created_idx    on public.visitor_events (event_type, created_at);
create index if not exists visitors_ip_hash_idx               on public.visitors (ip_hash);
create index if not exists visitors_last_seen_idx             on public.visitors (last_seen);
create index if not exists leads_phone_idx                    on public.leads (phone);
create index if not exists leads_created_at_idx               on public.leads (created_at);
create index if not exists leads_status_idx                   on public.leads (status);

-- ─── Row Level Security: on, with no public policies ────────────────────────

alter table public.visitors       enable row level security;
alter table public.visitor_events enable row level security;
alter table public.leads          enable row level security;

revoke all on public.visitors, public.visitor_events, public.leads from anon, authenticated;

-- ─── RPC: upsert visitor + insert event in one round trip ───────────────────
-- Called by track.php and lead.php with the service-role key.

create or replace function public.kyra_track(
  p_visitor_id   uuid,
  p_ip_hash      text,
  p_ip_raw       inet,
  p_country      text,
  p_region       text,
  p_city         text,
  p_latitude     numeric,
  p_longitude    numeric,
  p_device       text,
  p_browser      text,
  p_os           text,
  p_first_utm    jsonb,
  p_last_utm     jsonb,
  p_consent      text,
  p_new_visit    boolean,
  p_session_id   text,
  p_event_type   text,
  p_event_data   jsonb,
  p_page_url     text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into visitors as v (
    id, ip_hash, ip_raw, ip_raw_at, country, region, city, latitude, longitude,
    device, browser, os, first_utm, last_utm, consent_status
  ) values (
    p_visitor_id, p_ip_hash, p_ip_raw, case when p_ip_raw is not null then now() end,
    p_country, p_region, p_city, p_latitude, p_longitude,
    p_device, p_browser, p_os, coalesce(p_first_utm, p_last_utm), p_last_utm, coalesce(p_consent, 'pending')
  )
  on conflict (id) do update set
    last_seen      = now(),
    ip_hash        = excluded.ip_hash,
    -- raw IP: refresh when consented; never keep it once consent is rejected
    ip_raw         = case when excluded.consent_status = 'rejected' then null
                          else coalesce(excluded.ip_raw, v.ip_raw) end,
    ip_raw_at      = case when excluded.consent_status = 'rejected' then null
                          when excluded.ip_raw is not null then now()
                          else v.ip_raw_at end,
    country        = coalesce(excluded.country, v.country),
    region         = coalesce(excluded.region, v.region),
    city           = coalesce(excluded.city, v.city),
    latitude       = coalesce(excluded.latitude, v.latitude),
    longitude      = coalesce(excluded.longitude, v.longitude),
    device         = coalesce(excluded.device, v.device),
    browser        = coalesce(excluded.browser, v.browser),
    os             = coalesce(excluded.os, v.os),
    first_utm      = coalesce(v.first_utm, excluded.first_utm),
    last_utm       = coalesce(excluded.last_utm, v.last_utm),
    consent_status = excluded.consent_status,
    visit_count    = v.visit_count + case when p_new_visit then 1 else 0 end;

  insert into visitor_events (visitor_id, session_id, event_type, event_data, page_url)
  values (p_visitor_id, p_session_id, p_event_type, p_event_data, p_page_url);
end;
$$;

create or replace function public.kyra_set_consent(
  p_visitor_id  uuid,
  p_ip_hash     text,
  p_status      text,
  p_ip_raw      inet,
  p_categories  jsonb,
  p_source      text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into visitors as v (id, ip_hash, ip_raw, ip_raw_at, consent_status, consent_categories, consent_at)
  values (p_visitor_id, p_ip_hash,
          case when p_status = 'accepted' then p_ip_raw end,
          case when p_status = 'accepted' and p_ip_raw is not null then now() end,
          p_status, p_categories, now())
  on conflict (id) do update set
    last_seen          = now(),
    consent_status     = excluded.consent_status,
    consent_categories = excluded.consent_categories,
    consent_at         = now(),
    ip_raw             = case when excluded.consent_status = 'accepted' then coalesce(excluded.ip_raw, v.ip_raw) else null end,
    ip_raw_at          = case when excluded.consent_status = 'accepted' and excluded.ip_raw is not null then now()
                              when excluded.consent_status = 'accepted' then v.ip_raw_at
                              else null end;

  insert into visitor_events (visitor_id, event_type, event_data)
  values (p_visitor_id, 'consent_update', jsonb_build_object('status', p_status, 'categories', p_categories, 'source', p_source));
end;
$$;

-- Only the backend may call these.
revoke all on function public.kyra_track(uuid, text, inet, text, text, text, numeric, numeric, text, text, text, jsonb, jsonb, text, boolean, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.kyra_set_consent(uuid, text, text, inet, jsonb, text) from public, anon, authenticated;
grant execute on function public.kyra_track(uuid, text, inet, text, text, text, numeric, numeric, text, text, text, jsonb, jsonb, text, boolean, text, text, jsonb, text) to service_role;
grant execute on function public.kyra_set_consent(uuid, text, text, inet, jsonb, text) to service_role;

-- ─── Retention (pg_cron) ────────────────────────────────────────────────────
-- Enable once: Dashboard → Database → Extensions → pg_cron.

create extension if not exists pg_cron;

-- Erase raw IPs after 180 days  [VERIFY retention period with client]
select cron.schedule(
  'kyra-purge-raw-ip',
  '15 21 * * *',  -- 02:45 IST daily
  $$ update public.visitors set ip_raw = null, ip_raw_at = null
     where ip_raw is not null and ip_raw_at < now() - interval '180 days' $$
);

-- Drop old behavioural events after 13 months (keeps the table small).
select cron.schedule(
  'kyra-purge-old-events',
  '30 21 * * *',
  $$ delete from public.visitor_events where created_at < now() - interval '13 months' $$
);

-- Enquiry retention: 24 months [VERIFY] — uncomment once the client confirms.
-- select cron.schedule('kyra-purge-old-leads', '45 21 * * *',
--   $$ delete from public.leads where created_at < now() - interval '24 months' and status in ('new', 'closed_lost') $$);

-- ─── CRM access (example — adapt to the Kyra CRM's auth model) ──────────────
-- The CRM is authenticated and role-based. Give read/update access only to
-- staff whose JWT carries an app role, e.g. app_metadata.role = 'sales' | 'admin'.
--
-- grant select, update (status) on public.leads to authenticated;
-- grant select on public.visitors, public.visitor_events to authenticated;
-- create policy "crm staff read leads" on public.leads for select to authenticated
--   using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('sales', 'admin'));
-- create policy "crm staff update lead status" on public.leads for update to authenticated
--   using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('sales', 'admin'));
-- create policy "crm admins read visitors" on public.visitors for select to authenticated
--   using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- create policy "crm admins read events" on public.visitor_events for select to authenticated
--   using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Convenience view for the CRM (respects the caller's RLS via security_invoker).
create or replace view public.crm_leads_overview
with (security_invoker = true) as
select
  l.id, l.created_at, l.updated_at, l.status, l.intent, l.name, l.phone, l.budget, l.visit_date, l.message,
  l.submissions, l.city, l.region,
  l.utm -> 'last' ->> 'utm_source'   as utm_source,
  l.utm -> 'last' ->> 'utm_campaign' as utm_campaign,
  l.gclid is not null as from_google_ads,
  l.fbclid is not null as from_meta_ads,
  v.visit_count, v.first_seen, v.device, v.browser, v.os, v.country
from public.leads l
left join public.visitors v on v.id = l.visitor_id;

revoke all on public.crm_leads_overview from anon;
