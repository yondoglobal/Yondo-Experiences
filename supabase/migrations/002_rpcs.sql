-- Yondo Experiences: RPCs (security definer, explicit search_path)

-- ================= public catalogue (selling prices only)
create or replace function public.get_catalogue() returns jsonb
language sql stable security definer set search_path = '' as $$
with s as (select fee_pct / 100.0 as fee, profit_floor as fl, tiers from public.settings where id = 1),
today as (select (now() at time zone 'Asia/Dubai')::date as d),
pr as (
  select p.attraction, p.ticket, p.option_key, p.origins, p.period_start, p.period_end,
    case when p.rec_adult > 0 and p.rec_adult * (1 - s.fee) - p.cost_adult >= s.fl then p.rec_adult end as a,
    case when p.rec_trip > 0 and p.rec_trip * (1 - s.fee) - p.cost_trip >= s.fl then p.rec_trip end as t,
    case when p.rec_adult > 0 and p.rec_adult * (1 - s.fee) - p.cost_adult >= s.fl
          and p.rec_child > 0 and p.rec_child * (1 - s.fee) - p.cost_child >= s.fl then p.rec_child end as c
  from public.price_rows p cross join s cross join today
  where p.period_end >= today.d
),
ok as (select * from pr where a is not null or t is not null),
orig as (
  select option_key, array_agg(distinct trim(o) order by trim(o)) as origins
  from ok, unnest(string_to_array(coalesce(ok.origins, ''), ',')) as o
  where trim(o) <> '' group by option_key
),
opts as (
  select ok.attraction, ok.option_key, min(ok.ticket) as name,
    jsonb_agg(jsonb_build_object('s', ok.period_start, 'e', ok.period_end, 'a', ok.a, 'c', ok.c, 't', ok.t) order by ok.period_start) as periods
  from ok group by ok.attraction, ok.option_key
)
select jsonb_build_object(
  'generated', now(),
  'tiers', (select tiers from s),
  'experiences', coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', e.slug, 'src', e.source_name, 'name', e.name, 'cat', e.category, 'emirate', e.emirate,
      'blurb', e.blurb, 'img', e.image_key, 'imageUrl', e.image_url, 'featured', e.featured, 'sort', e.sort,
      'options', (select jsonb_agg(jsonb_build_object('key', o.option_key, 'name', o.name,
                    'origins', coalesce(to_jsonb(g.origins), '[]'::jsonb), 'periods', o.periods))
                  from opts o left join orig g on g.option_key = o.option_key
                  where o.attraction = e.source_name)
    ) order by e.sort, e.name)
    from public.experiences e
    where not e.hidden and exists (select 1 from opts o where o.attraction = e.source_name)
  ), '[]'::jsonb)
)
$$;

-- ================= pricing engine (internal: returns costs)
create or replace function public._compute_quote(p_option text, p_date date, p_adults int, p_children int, p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s record; r record; pc record;
  v_today date := (now() at time zone 'Asia/Dubai')::date;
  v_unit text; v_units int; v_sub numeric; v_cost numeric; v_pa numeric; v_pc numeric;
  v_disc numeric := 0; v_max numeric; v_code text; v_share numeric := 0; v_msg text; v_code_ok boolean := null;
  v_child_ok boolean;
begin
  select fee_pct / 100.0 as fee, profit_floor as fl into s from public.settings where id = 1;
  p_adults := coalesce(p_adults, 0); p_children := coalesce(p_children, 0);
  if p_date is null or p_date < v_today then
    return jsonb_build_object('ok', false, 'error', 'Pick a date from today onwards.');
  end if;
  if p_adults < 1 or p_adults > 60 or p_children < 0 or p_children > 30 then
    return jsonb_build_object('ok', false, 'error', 'Check the number of guests (1 to 60).');
  end if;

  select pr.*, e.slug, e.name as ename, e.category, e.emirate, e.hidden into r
  from public.price_rows pr join public.experiences e on e.source_name = pr.attraction
  where pr.option_key = p_option and p_date between pr.period_start and pr.period_end
    and ((pr.rec_adult > 0 and pr.rec_adult * (1 - s.fee) - pr.cost_adult >= s.fl)
      or (pr.rec_trip > 0 and pr.rec_trip * (1 - s.fee) - pr.cost_trip >= s.fl))
  order by pr.period_start desc, (pr.cost_adult + pr.cost_trip) asc
  limit 1;
  if not found or r.hidden then
    return jsonb_build_object('ok', false, 'error', 'This option isn''t available on that date. Try another date or ticket.');
  end if;

  if r.rec_adult > 0 and r.rec_adult * (1 - s.fee) - r.cost_adult >= s.fl then
    v_unit := 'person';
    v_child_ok := r.rec_child > 0 and r.rec_child * (1 - s.fee) - r.cost_child >= s.fl;
    v_pa := r.rec_adult;
    if v_child_ok then
      v_pc := r.rec_child;
      v_sub := p_adults * r.rec_adult + p_children * r.rec_child;
      v_cost := p_adults * r.cost_adult + p_children * r.cost_child;
    else
      v_pc := null; -- one price for everyone
      v_sub := (p_adults + p_children) * r.rec_adult;
      v_cost := (p_adults + p_children) * r.cost_adult;
    end if;
    v_units := p_adults + p_children;
  else
    v_unit := 'trip'; v_units := p_adults; v_pa := r.rec_trip; v_pc := null;
    v_sub := p_adults * r.rec_trip; v_cost := p_adults * r.cost_trip;
  end if;

  if nullif(trim(coalesce(p_code, '')), '') is not null then
    v_code := upper(trim(p_code));
    select * into pc from public.promo_codes where code = v_code;
    if not found or not pc.active or (pc.expires_at is not null and pc.expires_at < v_today) then
      v_msg := 'That code isn''t valid.'; v_code := null; v_code_ok := false;
    elsif pc.max_uses is not null and (select count(*) from public.bookings b where b.code = v_code and b.status <> 'cancelled') >= pc.max_uses then
      v_msg := 'That code has reached its limit.'; v_code := null; v_code_ok := false;
    else
      v_max := greatest(0, v_sub - (v_cost + s.fl * v_units) / (1 - s.fee));
      v_disc := floor(least(v_sub * pc.customer_discount_pct / 100.0, v_max));
      v_share := pc.commission_share_pct; v_code_ok := true;
      v_msg := case when v_disc > 0 then 'Code applied: AED ' || v_disc::text || ' off.'
                    else 'Code saved. This ticket is already at our best price, so no extra discount.' end;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true, 'unit', v_unit, 'units', v_units, 'priceAdult', v_pa, 'priceChild', v_pc,
    'subtotal', v_sub, 'discount', v_disc, 'total', v_sub - v_disc,
    'code', v_code, 'codeOk', v_code_ok, 'codeMessage', v_msg,
    'optionName', r.ticket, 'experienceSlug', r.slug, 'experienceName', r.ename,
    'category', r.category, 'emirate', r.emirate, 'origins', r.origins,
    '_cost', v_cost, '_fee', s.fee * 100, '_share', v_share);
end $$;
revoke execute on function public._compute_quote(text, date, int, int, text) from public, anon, authenticated;

create or replace function public.quote_booking(p_option text, p_date date, p_adults int, p_children int default 0, p_code text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public._compute_quote(p_option, p_date, p_adults, p_children, p_code) - '_cost' - '_fee' - '_share'
$$;

-- ================= validation helpers
create or replace function public._clean(t text, maxlen int) returns text
language sql immutable set search_path = '' as $$ select nullif(left(trim(coalesce(t, '')), maxlen), '') $$;

create or replace function public._valid_email(e text) returns boolean
language sql immutable set search_path = '' as $$ select coalesce(e, '') ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and length(e) <= 160 $$;

create or replace function public._valid_phone(p text) returns boolean
language sql immutable set search_path = '' as $$ select length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) between 7 and 15 $$;

-- ================= booking request (anon or signed in)
create or replace function public.request_booking(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  q jsonb; v_ref text; v_name text; v_email text; v_phone text; v_date date;
begin
  if coalesce(p ->> 'website', '') <> '' then  -- honeypot
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
    adults, children, price_adult, price_child, subtotal, discount, total, cost_total, fee_pct, code, commission_share)
  values (auth.uid(), v_name, v_email, v_phone, public._clean(p ->> 'university', 120), public._clean(p ->> 'pickup', 60),
    public._clean(p ->> 'notes', 1000),
    q ->> 'experienceSlug', q ->> 'experienceName', q ->> 'category', q ->> 'emirate', p ->> 'option', q ->> 'optionName', q ->> 'unit', v_date,
    (p ->> 'adults')::int, case when q ->> 'unit' = 'trip' then 0 else coalesce((p ->> 'children')::int, 0) end,
    (q ->> 'priceAdult')::numeric, (q ->> 'priceChild')::numeric, (q ->> 'subtotal')::numeric, (q ->> 'discount')::numeric,
    (q ->> 'total')::numeric, (q ->> '_cost')::numeric, (q ->> '_fee')::numeric, q ->> 'code', (q ->> '_share')::numeric)
  returning ref into v_ref;

  return (q - '_cost' - '_fee' - '_share') || jsonb_build_object('ref', v_ref, 'date', v_date);
end $$;

-- ================= track a booking without signing in
create or replace function public.track_booking(p_ref text, p_email text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'ref', b.ref, 'status', b.status, 'experienceName', b.experience_name,
      'optionName', b.option_name, 'date', b.travel_date, 'adults', b.adults, 'children', b.children, 'unit', b.unit,
      'total', b.total, 'discount', b.discount, 'paymentLink', case when b.status in ('confirmed') then b.payment_link end,
      'createdAt', b.created_at)
    from public.bookings b
    where b.ref = upper(trim(p_ref)) and lower(b.email) = lower(trim(p_email))
  ), jsonb_build_object('ok', false, 'error', 'We couldn''t find a booking with that reference and email.'))
$$;

-- ================= passport
create or replace function public.my_passport() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'Sign in to open your passport.'); end if;
  insert into public.profiles (user_id, email) values (v_uid, v_email) on conflict (user_id) do nothing;
  if v_email <> '' then
    update public.bookings set user_id = v_uid where user_id is null and lower(email) = v_email;
  end if;
  return jsonb_build_object('ok', true,
    'profile', (select jsonb_build_object('passportNo', pf.passport_no, 'email', pf.email, 'fullName', pf.full_name,
                  'university', pf.university, 'phone', pf.phone, 'since', pf.created_at)
                from public.profiles pf where pf.user_id = v_uid),
    'tiers', (select tiers from public.settings where id = 1),
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('ref', b.ref, 'status', b.status, 'experienceSlug', b.experience_slug,
                  'experienceName', b.experience_name, 'optionName', b.option_name, 'category', b.category, 'emirate', b.emirate,
                  'date', b.travel_date, 'adults', b.adults, 'children', b.children, 'unit', b.unit, 'total', b.total,
                  'paymentLink', case when b.status = 'confirmed' then b.payment_link end,
                  'completedAt', b.completed_at, 'createdAt', b.created_at) order by b.created_at desc)
                from public.bookings b where b.user_id = v_uid), '[]'::jsonb));
end $$;
revoke execute on function public.my_passport() from public, anon;
grant execute on function public.my_passport() to authenticated;

create or replace function public.update_profile(p_full_name text, p_university text, p_phone text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  update public.profiles set full_name = public._clean(p_full_name, 80), university = public._clean(p_university, 120),
    phone = public._clean(p_phone, 30) where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.update_profile(text, text, text) from public, anon;
grant execute on function public.update_profile(text, text, text) to authenticated;

-- ================= curated trip requests + waitlist
create or replace function public.request_trip(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
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
  insert into public.trip_requests (kind, title, preferred_date, group_size, budget, details, name, email, phone, university, code)
  values (p ->> 'kind', public._clean(p ->> 'title', 120), v_date, least(greatest(coalesce((p ->> 'groupSize')::int, 1), 1), 500),
    public._clean(p ->> 'budget', 60), public._clean(p ->> 'details', 1500), public._clean(p ->> 'name', 80), v_email,
    public._clean(p ->> 'phone', 30), public._clean(p ->> 'university', 120), upper(public._clean(p ->> 'code', 24)))
  returning ref into v_ref;
  return jsonb_build_object('ok', true, 'ref', v_ref);
end $$;

create or replace function public.join_waitlist(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_email text := lower(public._clean(p ->> 'email', 160));
begin
  if coalesce(p ->> 'website', '') <> '' then return jsonb_build_object('ok', true); end if;
  if public._clean(p ->> 'name', 80) is null then return jsonb_build_object('ok', false, 'error', 'Add your name.'); end if;
  if not public._valid_email(v_email) then return jsonb_build_object('ok', false, 'error', 'Check your email address.'); end if;
  if exists (select 1 from public.waitlist w where lower(w.email) = v_email and coalesce(w.interest, '') = coalesce(p ->> 'interest', '')) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  insert into public.waitlist (name, email, phone, university, interest, group_size)
  values (public._clean(p ->> 'name', 80), v_email, public._clean(p ->> 'phone', 30), public._clean(p ->> 'university', 120),
    public._clean(p ->> 'interest', 120), least(greatest(coalesce((p ->> 'groupSize')::int, 1), 1), 500));
  return jsonb_build_object('ok', true);
end $$;

-- ================= admin: price list import
create or replace function public.admin_import_prices(p_rows jsonb, p_source text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_count int; v_new text[];
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 10 then
    return jsonb_build_object('ok', false, 'error', 'That file has too few price rows. Nothing was changed.');
  end if;
  delete from public.price_rows where true;
  insert into public.price_rows (attraction, ticket, origins, period_start, period_end, rec_adult, rec_child, rec_trip,
                                 cost_adult, cost_child, cost_trip, source_file)
  select r.attraction, r.ticket, r.origins, r.start::date, r."end"::date, coalesce(r.rec_adult, 0), coalesce(r.rec_child, 0),
         coalesce(r.rec_trip, 0), coalesce(r.cost_adult, 0), coalesce(r.cost_child, 0), coalesce(r.cost_trip, 0), p_source
  from jsonb_to_recordset(p_rows) as r(attraction text, ticket text, origins text, start text, "end" text,
       rec_adult numeric, rec_child numeric, rec_trip numeric, cost_adult numeric, cost_child numeric, cost_trip numeric)
  where coalesce(r.attraction, '') <> '' and coalesce(r.ticket, '') <> '';
  get diagnostics v_count = row_count;

  select coalesce(array_agg(distinct pr.attraction), '{}') into v_new
  from public.price_rows pr where not exists (select 1 from public.experiences e where e.source_name = pr.attraction);

  insert into public.experiences (slug, source_name, name, category, hidden)
  select public.yx_slug(a) || case when exists (select 1 from public.experiences e2 where e2.slug = public.yx_slug(a)) then '-' || substr(md5(a), 1, 4) else '' end,
         a, a, 'city', true
  from unnest(v_new) as a
  on conflict do nothing;

  insert into public.price_imports (source_file, row_count, new_attractions, imported_by)
  values (p_source, v_count, v_new, auth.jwt() ->> 'email');
  return jsonb_build_object('ok', true, 'rows', v_count, 'newAttractions', to_jsonb(v_new));
end $$;
revoke execute on function public.admin_import_prices(jsonb, text) from public, anon;
grant execute on function public.admin_import_prices(jsonb, text) to authenticated;

-- ================= admin: code performance
create view public.admin_code_stats with (security_invoker = true) as
select c.code, c.owner_name, c.owner_contact, c.kind, c.customer_discount_pct, c.commission_share_pct, c.active, c.max_uses,
  c.expires_at, c.notes, c.created_at,
  count(b.id) filter (where b.status <> 'cancelled') as uses,
  coalesce(sum(b.total) filter (where b.status in ('paid','completed')), 0) as revenue,
  coalesce(sum(b.discount) filter (where b.status in ('paid','completed')), 0) as discounts_given,
  coalesce(sum(b.commission) filter (where b.status in ('paid','completed') and b.commission_paid_at is null), 0) as commission_owed,
  coalesce(sum(b.commission) filter (where b.commission_paid_at is not null), 0) as commission_paid
from public.promo_codes c
left join public.admin_bookings b on b.code = c.code
group by c.code;

-- helper functions are internal
revoke execute on function public._clean(text, int) from public, anon, authenticated;
revoke execute on function public._valid_email(text) from public, anon, authenticated;
revoke execute on function public._valid_phone(text) from public, anon, authenticated;
revoke execute on function public.yx_ref(text) from public, anon, authenticated;
