-- Customers list with marketing consent, visit tracking, and alerts (Telegram / webhook) for activity.

-- ---------- marketing consent
alter table public.bookings add column if not exists marketing_opt_in boolean not null default false;
alter table public.trip_requests add column if not exists marketing_opt_in boolean not null default false;
alter table public.waitlist add column if not exists marketing_opt_in boolean not null default false;

-- Explicit choices (passport setting, or admin marking someone unsubscribed). The latest choice wins over form ticks.
create table if not exists public.marketing_prefs (
  email text primary key,
  opted_in boolean not null,
  source text not null default 'admin',
  at timestamptz not null default now()
);
alter table public.marketing_prefs enable row level security;
create policy marketing_prefs_admin on public.marketing_prefs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.request_booking(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  q jsonb; v_ref text; v_name text; v_email text; v_phone text; v_date date;
begin
  if coalesce(p ->> 'website', '') <> '' then
    return jsonb_build_object('ok', true, 'ref', public.yx_ref('YX'));
  end if;
  v_name := public._clean(p ->> 'name', 80);
  v_email := lower(public._clean(p ->> 'email', 160));
  v_phone := public._clean(p ->> 'phone', 30);
  if v_name is null or length(v_name) < 2 then return jsonb_build_object('ok', false, 'error', 'Add your name.'); end if;
  if not public._valid_email(v_email) then return jsonb_build_object('ok', false, 'error', 'Check your email address.'); end if;
  if not public._valid_phone(v_phone) then return jsonb_build_object('ok', false, 'error', 'Add a WhatsApp number we can reach you on.'); end if;
  begin v_date := (p ->> 'date')::date; exception when others then v_date := null; end;
  if (select count(*) from public.bookings b where lower(b.email) = v_email and b.created_at > now() - interval '1 hour') >= 6 then
    return jsonb_build_object('ok', false, 'error', 'You''ve sent a lot of requests in the last hour. Message us on WhatsApp and we''ll sort it.');
  end if;

  q := public._compute_quote(p ->> 'option', v_date, (p ->> 'adults')::int, coalesce((p ->> 'children')::int, 0), p ->> 'code');
  if not (q ->> 'ok')::boolean then return q; end if;

  insert into public.bookings (user_id, name, email, phone, university, pickup, notes,
    experience_slug, experience_name, category, emirate, option_key, option_name, unit, travel_date,
    adults, children, units, price_adult, price_child, price_trip, subtotal, standard_subtotal, discount, total, cost_total, fee_pct,
    code, commission_share, commission_type, commission_value, offer_label, group_min, marketing_opt_in)
  values (auth.uid(), v_name, v_email, v_phone, public._clean(p ->> 'university', 120), public._clean(p ->> 'pickup', 60),
    public._clean(p ->> 'notes', 1000),
    q ->> 'experienceSlug', q ->> 'experienceName', q ->> 'category', q ->> 'emirate', p ->> 'option', q ->> 'optionName', q ->> 'unit', v_date,
    (p ->> 'adults')::int, case when q ->> 'unit' = 'trip' then 0 else coalesce((p ->> 'children')::int, 0) end, (q ->> 'units')::int,
    (q ->> 'priceAdult')::numeric, (q ->> 'priceChild')::numeric, (q ->> 'priceTrip')::numeric, (q ->> 'subtotal')::numeric,
    (q ->> 'standardSubtotal')::numeric, (q ->> 'discount')::numeric, (q ->> 'total')::numeric, (q ->> '_cost')::numeric,
    (q ->> '_fee')::numeric, q ->> 'code', coalesce((q ->> '_cval')::numeric, 0), q ->> '_ctype', (q ->> '_cval')::numeric, q ->> 'offer',
    (q ->> 'groupMin')::int, coalesce((p ->> 'marketing')::boolean, false))
  returning ref into v_ref;

  return (q - '_cost' - '_fee' - '_ctype' - '_cval') || jsonb_build_object('ref', v_ref, 'date', v_date);
end $$;

create or replace function public.request_trip(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ref text; v_email text := lower(public._clean(p ->> 'email', 160)); v_date date;
begin
  if coalesce(p ->> 'website', '') <> '' then return jsonb_build_object('ok', true, 'ref', public.yx_ref('YQ')); end if;
  if public._clean(p ->> 'name', 80) is null then return jsonb_build_object('ok', false, 'error', 'Add your name.'); end if;
  if not public._valid_email(v_email) then return jsonb_build_object('ok', false, 'error', 'Check your email address.'); end if;
  if not public._valid_phone(p ->> 'phone') then return jsonb_build_object('ok', false, 'error', 'Add a WhatsApp number we can reach you on.'); end if;
  if coalesce(p ->> 'kind', '') not in ('yacht','desert','road-trip','group','custom') then return jsonb_build_object('ok', false, 'error', 'Pick a trip type.'); end if;
  if (select count(*) from public.trip_requests t where lower(t.email) = v_email and t.created_at > now() - interval '1 hour') >= 6 then
    return jsonb_build_object('ok', false, 'error', 'You''ve sent a lot of requests in the last hour. Message us on WhatsApp instead.');
  end if;
  begin v_date := nullif(p ->> 'date', '')::date; exception when others then v_date := null; end;
  insert into public.trip_requests (kind, title, preferred_date, group_size, budget, details, name, email, phone, university, code, marketing_opt_in)
  values (p ->> 'kind', public._clean(p ->> 'title', 120), v_date, least(greatest(coalesce((p ->> 'groupSize')::int, 1), 1), 500),
    public._clean(p ->> 'budget', 60), public._clean(p ->> 'details', 1500), public._clean(p ->> 'name', 80), v_email,
    public._clean(p ->> 'phone', 30), public._clean(p ->> 'university', 120), upper(public._clean(p ->> 'code', 24)),
    coalesce((p ->> 'marketing')::boolean, false))
  returning ref into v_ref;
  return jsonb_build_object('ok', true, 'ref', v_ref);
end $$;

create or replace function public.join_waitlist(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(public._clean(p ->> 'email', 160));
begin
  if coalesce(p ->> 'website', '') <> '' then return jsonb_build_object('ok', true); end if;
  if public._clean(p ->> 'name', 80) is null then return jsonb_build_object('ok', false, 'error', 'Add your name.'); end if;
  if not public._valid_email(v_email) then return jsonb_build_object('ok', false, 'error', 'Check your email address.'); end if;
  if exists (select 1 from public.waitlist w where lower(w.email) = v_email and coalesce(w.interest, '') = coalesce(p ->> 'interest', '')) then
    if coalesce((p ->> 'marketing')::boolean, false) then
      update public.waitlist set marketing_opt_in = true where lower(email) = v_email and coalesce(interest, '') = coalesce(p ->> 'interest', '');
    end if;
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  insert into public.waitlist (name, email, phone, university, interest, group_size, marketing_opt_in)
  values (public._clean(p ->> 'name', 80), v_email, public._clean(p ->> 'phone', 30), public._clean(p ->> 'university', 120),
    public._clean(p ->> 'interest', 120), least(greatest(coalesce((p ->> 'groupSize')::int, 1), 1), 500), coalesce((p ->> 'marketing')::boolean, false));
  return jsonb_build_object('ok', true);
end $$;

-- Signed-in customers choose for themselves in their passport.
create or replace function public.set_marketing_pref(p_opted_in boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or v_email = '' then return jsonb_build_object('ok', false); end if;
  insert into public.marketing_prefs (email, opted_in, source, at) values (v_email, p_opted_in, 'passport', now())
  on conflict (email) do update set opted_in = excluded.opted_in, source = excluded.source, at = excluded.at;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.set_marketing_pref(boolean) from public, anon;
grant execute on function public.set_marketing_pref(boolean) to authenticated;

-- One row per email across bookings, quote requests, waitlist and passport sign-ups.
create or replace function public.admin_contacts_base()
returns table (email text, name text, phone text, university text, sources text[], bookings int, paid int, spent numeric,
               first_seen timestamptz, last_seen timestamptz, opted_in boolean, consent_at timestamptz, passport_no text)
language sql stable security definer set search_path = '' as $$
with ev as (
  select lower(b.email) e, b.name, b.phone, b.university, 'booking' src, b.created_at at, b.marketing_opt_in yes,
         1 bk, case when b.status in ('paid','completed') then 1 else 0 end pd, case when b.status in ('paid','completed') then b.total else 0 end amt
  from public.bookings b
  union all
  select lower(t.email), t.name, t.phone, t.university, 'quote', t.created_at, t.marketing_opt_in, 0, 0, 0 from public.trip_requests t
  union all
  select lower(w.email), w.name, w.phone, w.university, 'waitlist', w.created_at, w.marketing_opt_in, 0, 0, 0 from public.waitlist w
  union all
  select lower(p.email), p.full_name, p.phone, p.university, 'passport', p.created_at, false, 0, 0, 0 from public.profiles p where p.email is not null
),
agg as (
  select e,
    (array_agg(name order by at desc) filter (where name is not null))[1] as name,
    (array_agg(phone order by at desc) filter (where phone is not null))[1] as phone,
    (array_agg(university order by at desc) filter (where university is not null))[1] as university,
    array_agg(distinct src) as sources, sum(bk)::int as bookings, sum(pd)::int as paid, sum(amt) as spent,
    min(at) as first_seen, max(at) as last_seen,
    max(at) filter (where yes) as last_yes
  from ev where e is not null and e <> '' group by e
)
select a.e, a.name, a.phone, a.university, a.sources, a.bookings, a.paid, a.spent, a.first_seen, a.last_seen,
  case when mp.email is not null and (a.last_yes is null or mp.at >= a.last_yes) then mp.opted_in else a.last_yes is not null end as opted_in,
  case when mp.email is not null and (a.last_yes is null or mp.at >= a.last_yes) then mp.at else a.last_yes end as consent_at,
  (select pf.passport_no from public.profiles pf where lower(pf.email) = a.e limit 1)
from agg a left join public.marketing_prefs mp on mp.email = a.e
$$;
revoke execute on function public.admin_contacts_base() from public, anon, authenticated;

create or replace function public.admin_contacts()
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select to_jsonb(c) from public.admin_contacts_base() c order by c.last_seen desc;
end $$;
revoke execute on function public.admin_contacts() from public, anon;
grant execute on function public.admin_contacts() to authenticated;

create or replace function public.admin_set_marketing(p_email text, p_opted_in boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.marketing_prefs (email, opted_in, source, at) values (lower(trim(p_email)), p_opted_in, 'admin', now())
  on conflict (email) do update set opted_in = excluded.opted_in, source = excluded.source, at = excluded.at;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.admin_set_marketing(text, boolean) from public, anon;
grant execute on function public.admin_set_marketing(text, boolean) to authenticated;

create or replace function public.my_marketing() returns boolean
language sql stable security definer set search_path = '' as $$
  select c.opted_in from public.admin_contacts_base() c where c.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
revoke execute on function public.my_marketing() from public, anon;
grant execute on function public.my_marketing() to authenticated;

-- ---------- visits (first-party, anonymous: random ids kept in the visitor's browser, no IP stored)
create table if not exists public.visits (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  sid text not null,
  vid text,
  new_session boolean not null default false,
  is_returning boolean not null default false,
  path text,
  title text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  lang text
);
create index if not exists visits_at_idx on public.visits (at desc);
create index if not exists visits_sid_idx on public.visits (sid);
alter table public.visits enable row level security;
create policy visits_admin_read on public.visits for select to authenticated using (public.is_admin());

create or replace function public.track_visit(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid text := left(coalesce(p ->> 'sid', ''), 40);
begin
  if v_sid = '' or length(v_sid) < 8 then return; end if;
  if (select count(*) from public.visits v where v.sid = v_sid and v.at > now() - interval '1 hour') >= 120 then return; end if;
  insert into public.visits (sid, vid, new_session, is_returning, path, title, referrer, utm_source, utm_medium, utm_campaign, device, lang)
  values (v_sid, left(p ->> 'vid', 40), coalesce((p ->> 'newSession')::boolean, false), coalesce((p ->> 'returning')::boolean, false),
    public._clean(p ->> 'path', 200), public._clean(p ->> 'title', 160), public._clean(p ->> 'referrer', 300),
    public._clean(p ->> 'utmSource', 80), public._clean(p ->> 'utmMedium', 80), public._clean(p ->> 'utmCampaign', 120),
    public._clean(p ->> 'device', 20), public._clean(p ->> 'lang', 20));
end $$;
grant execute on function public.track_visit(jsonb) to anon, authenticated;

-- ---------- alerts
create extension if not exists pg_net with schema extensions;
create table if not exists public.notify_settings (
  id int primary key default 1 check (id = 1),
  telegram_token text,
  telegram_chat_id text,
  webhook_url text,
  on_booking boolean not null default true,
  on_quote boolean not null default true,
  on_waitlist boolean not null default true,
  on_signup boolean not null default true,
  on_visit boolean not null default false,
  daily_summary boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.notify_settings (id) values (1) on conflict do nothing;
alter table public.notify_settings enable row level security;
create policy notify_settings_admin on public.notify_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public._notify(p_event text, p_text text, p_data jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.notify_settings; v_on boolean;
begin
  select * into s from public.notify_settings where id = 1;
  if s.id is null then return; end if;
  v_on := case p_event
      when 'test' then true when 'booking' then s.on_booking when 'quote' then s.on_quote when 'waitlist' then s.on_waitlist
      when 'signup' then s.on_signup when 'visit' then s.on_visit when 'daily' then s.daily_summary else false end;
  if not coalesce(v_on, false) then
    return;
  end if;
  if coalesce(s.telegram_token, '') <> '' and coalesce(s.telegram_chat_id, '') <> '' then
    perform net.http_post(
      url := 'https://api.telegram.org/bot' || s.telegram_token || '/sendMessage',
      body := jsonb_build_object('chat_id', s.telegram_chat_id, 'text', p_text, 'disable_web_page_preview', true));
  end if;
  if coalesce(s.webhook_url, '') ~ '^https://' then
    perform net.http_post(url := s.webhook_url,
      body := jsonb_build_object('event', p_event, 'text', p_text, 'data', p_data, 'at', now()));
  end if;
exception when others then
  -- alerts must never block a booking
  null;
end $$;
revoke execute on function public._notify(text, text, jsonb) from public, anon, authenticated;

create or replace function public.tg_notify_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_admin text := 'https://experiences.yondo.global/admin';
begin
  if tg_table_name = 'bookings' then
    perform public._notify('booking',
      '🎟 New booking request ' || new.ref || E'\n' || new.experience_name || ' · ' || coalesce(new.option_name, '') || E'\n' ||
      to_char(new.travel_date, 'DD Mon') || ' · ' || (new.adults + new.children) || case when new.unit = 'trip' then ' booking(s)' else ' guest(s)' end ||
      ' · AED ' || trim(to_char(new.total, 'FM999G999D00')) || E'\n' || new.name || ' · ' || coalesce(new.phone, '') ||
      case when new.code is not null then E'\nCode ' || new.code else '' end || E'\n' || v_admin,
      jsonb_build_object('ref', new.ref, 'experience', new.experience_name, 'option', new.option_name, 'date', new.travel_date,
        'adults', new.adults, 'children', new.children, 'total', new.total, 'name', new.name, 'email', new.email, 'phone', new.phone, 'code', new.code));
  elsif tg_table_name = 'trip_requests' then
    perform public._notify('quote',
      '🧭 New quote request ' || new.ref || E'\n' || initcap(replace(new.kind, '-', ' ')) || coalesce(': ' || new.title, '') || E'\n' ||
      coalesce(to_char(new.preferred_date, 'DD Mon'), 'No date yet') || ' · group of ' || new.group_size || coalesce(' · ' || new.budget, '') || E'\n' ||
      new.name || ' · ' || coalesce(new.phone, '') || E'\n' || v_admin,
      jsonb_build_object('ref', new.ref, 'kind', new.kind, 'title', new.title, 'date', new.preferred_date, 'groupSize', new.group_size,
        'name', new.name, 'email', new.email, 'phone', new.phone));
  elsif tg_table_name = 'waitlist' then
    perform public._notify('waitlist', '📝 Joined the group trip waitlist: ' || new.name || coalesce(' (' || new.university || ')', '') ||
      coalesce(E'\n' || new.interest, ''), jsonb_build_object('name', new.name, 'email', new.email, 'interest', new.interest));
  elsif tg_table_name = 'profiles' then
    perform public._notify('signup', '🛂 New passport sign-up: ' || coalesce(new.email, ''), jsonb_build_object('email', new.email));
  elsif tg_table_name = 'visits' and new.new_session then
    perform public._notify('visit',
      '👀 ' || case when new.is_returning then 'Returning' else 'New' end || ' visitor on ' || coalesce(new.path, '/') ||
      coalesce(E'\nFrom ' || nullif(coalesce(new.utm_source, regexp_replace(new.referrer, '^https?://([^/]+).*$', '\1')), ''), '') ||
      coalesce(' · ' || new.device, ''),
      jsonb_build_object('path', new.path, 'referrer', new.referrer, 'utmSource', new.utm_source, 'device', new.device));
  end if;
  return null;
end $$;
revoke execute on function public.tg_notify_activity() from public, anon, authenticated;

create trigger notify_booking after insert on public.bookings for each row execute function public.tg_notify_activity();
create trigger notify_quote after insert on public.trip_requests for each row execute function public.tg_notify_activity();
create trigger notify_waitlist after insert on public.waitlist for each row execute function public.tg_notify_activity();
create trigger notify_signup after insert on public.profiles for each row execute function public.tg_notify_activity();
create trigger notify_visit after insert on public.visits for each row when (new.new_session) execute function public.tg_notify_activity();

create or replace function public.admin_test_notify() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform public._notify('test', '✅ Yondo Experiences alerts are connected. You will get a message here for new activity.', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.admin_test_notify() from public, anon;
grant execute on function public.admin_test_notify() to authenticated;

-- Daily summary at 21:00 Dubai time.
create or replace function public._daily_summary() returns void
language plpgsql security definer set search_path = '' as $$
declare
  d0 timestamptz := date_trunc('day', now() at time zone 'Asia/Dubai') at time zone 'Asia/Dubai';
  v_vis int; v_views int; v_bk int; v_amt numeric; v_q int; v_w int; v_s int; v_top text;
begin
  select count(distinct sid), count(*) into v_vis, v_views from public.visits where at >= d0;
  select count(*), coalesce(sum(total), 0) into v_bk, v_amt from public.bookings where created_at >= d0;
  select count(*) into v_q from public.trip_requests where created_at >= d0;
  select count(*) into v_w from public.waitlist where created_at >= d0;
  select count(*) into v_s from public.profiles where created_at >= d0;
  select string_agg(path || ' (' || n || ')', ', ') into v_top from (
    select path, count(*) n from public.visits where at >= d0 and path like '/experiences/%' group by path order by n desc limit 3) t;
  perform public._notify('daily',
    '📊 Yondo today' || E'\n' || v_vis || ' visitors · ' || v_views || ' page views' || E'\n' ||
    v_bk || ' booking requests (AED ' || trim(to_char(v_amt, 'FM999G999G990')) || ')' || E'\n' ||
    v_q || ' quote requests · ' || v_w || ' waitlist · ' || v_s || ' passport sign-ups' ||
    coalesce(E'\nMost viewed: ' || v_top, ''),
    jsonb_build_object('visitors', v_vis, 'views', v_views, 'bookings', v_bk, 'requested', v_amt, 'quotes', v_q, 'waitlist', v_w, 'signups', v_s));
end $$;
revoke execute on function public._daily_summary() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('yondo-daily-summary', '0 17 * * *', 'select public._daily_summary()');

-- Live activity feed in the admin.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'waitlist') then
    alter publication supabase_realtime add table public.waitlist;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'visits') then
    alter publication supabase_realtime add table public.visits;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
