-- Group prices: "from N guests, AED X per person" tiers per ticket (e.g. 2+ AED 95 each, 4+ AED 90 each).
create table if not exists public.group_prices (
  id bigint generated always as identity primary key,
  option_key text not null,
  min_guests int not null check (min_guests between 2 and 200),
  price_pp numeric not null check (price_pp > 0),
  label text,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_key, min_guests)
);
alter table public.group_prices enable row level security;
create policy group_prices_admin on public.group_prices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger group_prices_touch before update on public.group_prices for each row execute function public.tg_touch();

alter table public.bookings add column if not exists group_min int;

-- Replace a ticket's group prices in one go (admin only).
create or replace function public.admin_set_group_prices(p_option text, p_tiers jsonb, p_label text default null, p_starts date default null, p_ends date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_ends is not null and p_starts is not null and p_ends < p_starts then
    return jsonb_build_object('ok', false, 'error', 'The end date is before the start date.');
  end if;
  delete from public.group_prices where option_key = p_option;
  insert into public.group_prices (option_key, min_guests, price_pp, label, starts_on, ends_on)
  select distinct on ((t ->> 'n')::int) p_option, (t ->> 'n')::int, round((t ->> 'p')::numeric, 2), nullif(trim(coalesce(p_label, '')), ''), p_starts, p_ends
  from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) t
  where (t ->> 'n')::int between 2 and 200 and (t ->> 'p')::numeric > 0
  order by (t ->> 'n')::int, (t ->> 'p')::numeric;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'count', v_n);
end $$;
revoke execute on function public.admin_set_group_prices(text, jsonb, text, date, date) from public, anon;
grant execute on function public.admin_set_group_prices(text, jsonb, text, date, date) to authenticated;

-- Pricing engine: the best group price for the party size replaces the adult price when it is lower.
create or replace function public._compute_quote(p_option text, p_date date, p_adults int, p_children int, p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s record; r record; pc record; ov public.price_overrides; gp public.group_prices;
  v_today date := (now() at time zone 'Asia/Dubai')::date;
  v_d numeric; v_unit text; v_units int; v_sub numeric; v_std numeric; v_cost numeric;
  v_pa numeric; v_pc numeric; v_pt numeric; v_ma numeric; v_mc numeric; v_mt numeric;
  v_disc numeric := 0; v_max numeric; v_code text; v_msg text; v_code_ok boolean := null;
  v_ctype text; v_cval numeric := 0; v_child_ok boolean; v_combined boolean; v_fl numeric;
  v_group int; v_group_label text;
begin
  select fee_pct / 100.0 as fee, profit_floor as fl, site_discount_pct as d into s from public.settings where id = 1;
  p_adults := coalesce(p_adults, 0); p_children := coalesce(p_children, 0);
  if p_date is null or p_date < v_today then
    return jsonb_build_object('ok', false, 'error', 'Pick a date from today onwards.');
  end if;
  if p_adults < 1 or p_adults > 60 or p_children < 0 or p_children > 30 then
    return jsonb_build_object('ok', false, 'error', 'Check the number of guests (1 to 60).');
  end if;

  select pr.*, e.slug, e.name as ename, e.category, e.emirate, e.hidden, e.discount_pct into r
  from public.price_rows pr join public.experiences e on e.source_name = pr.attraction
  where pr.option_key = p_option and p_date between pr.period_start and pr.period_end
    and public._row_sellable(pr.rec_adult, pr.rec_trip, pr.cost_adult, pr.cost_trip, s.fee, s.fl)
  order by pr.period_start desc, (pr.cost_adult + pr.cost_trip) asc
  limit 1;
  if not found or r.hidden then
    return jsonb_build_object('ok', false, 'error', 'This option isn''t available on that date. Try another date or ticket.');
  end if;
  ov := public._override_for(p_option, p_date);
  v_d := coalesce(r.discount_pct, s.d);
  v_combined := r.rec_adult > 0 and r.rec_trip > 0;

  if r.rec_adult > 0 then
    v_unit := case when v_combined then 'person+trip' else 'person' end;
    v_pa := coalesce(ov.sell_adult, public._sell(r.rec_adult, r.cost_adult, v_d, s.fee, case when v_combined then 0 else s.fl end));
    v_ma := r.rec_adult;
    v_child_ok := r.rec_child > 0 and r.rec_child * (1 - s.fee) - r.cost_child >= case when v_combined then 0 else s.fl end;
    if v_child_ok then
      v_pc := coalesce(ov.sell_child, public._sell(r.rec_child, r.cost_child, v_d, s.fee, case when v_combined then 0 else s.fl end));
      v_mc := r.rec_child;
    end if;
    if v_combined then
      v_pt := coalesce(ov.sell_trip, public._sell(r.rec_trip, r.cost_trip, v_d, s.fee, s.fl));
      v_mt := r.rec_trip;
    end if;
    select g.* into gp from public.group_prices g
    where g.option_key = p_option and g.active and g.min_guests <= p_adults + p_children
      and (g.starts_on is null or g.starts_on <= p_date) and (g.ends_on is null or g.ends_on >= p_date)
    order by g.min_guests desc limit 1;
    if gp.id is not null and gp.price_pp < v_pa then
      v_pa := gp.price_pp;
      if v_pc is not null then v_pc := least(v_pc, gp.price_pp); end if;
      v_group := gp.min_guests;
      v_group_label := coalesce(gp.label, 'Group price, ' || gp.min_guests || '+ guests');
    end if;
    v_sub := p_adults * v_pa + p_children * coalesce(v_pc, v_pa) + coalesce(v_pt, 0);
    v_std := p_adults * v_ma + p_children * coalesce(v_mc, v_ma) + coalesce(v_mt, 0);
    v_cost := p_adults * r.cost_adult + p_children * case when v_child_ok then r.cost_child else r.cost_adult end
              + case when v_combined then r.cost_trip else 0 end;
    v_units := p_adults + p_children;
  else
    v_unit := 'trip'; v_units := p_adults;
    v_pa := coalesce(ov.sell_trip, public._sell(r.rec_trip, r.cost_trip, v_d, s.fee, s.fl)); v_ma := r.rec_trip;
    v_sub := p_adults * v_pa; v_std := p_adults * v_ma; v_cost := p_adults * r.cost_trip;
  end if;

  if nullif(trim(coalesce(p_code, '')), '') is not null then
    v_code := upper(trim(p_code));
    select * into pc from public.promo_codes where code = v_code;
    if not found or not pc.active or (pc.expires_at is not null and pc.expires_at < v_today) then
      v_msg := 'That code isn''t valid.'; v_code := null; v_code_ok := false;
    elsif pc.max_uses is not null and (select count(*) from public.bookings b where b.code = v_code and b.status <> 'cancelled') >= pc.max_uses then
      v_msg := 'That code has reached its limit.'; v_code := null; v_code_ok := false;
    else
      v_ctype := pc.commission_type; v_cval := coalesce(pc.commission_value, pc.commission_share_pct, 0);
      v_fl := s.fl * v_units;
      v_max := case v_ctype
        when 'sale_pct' then v_sub - (v_cost + v_fl) / greatest(0.01, 1 - s.fee - v_cval / 100.0)
        when 'fixed_ticket' then v_sub - (v_cost + v_fl + v_cval * v_units) / (1 - s.fee)
        when 'fixed_booking' then v_sub - (v_cost + v_fl + v_cval) / (1 - s.fee)
        else v_sub - (v_cost + v_fl / greatest(0.01, 1 - v_cval / 100.0)) / (1 - s.fee) end;
      v_disc := floor(greatest(0, least(v_sub * pc.customer_discount_pct / 100.0, v_max)));
      v_code_ok := true;
      v_msg := case when v_disc > 0 then 'Code applied: AED ' || v_disc::text || ' extra off.'
                    else 'Code saved. This ticket is already at our lowest rate, so no extra discount.' end;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true, 'unit', v_unit, 'units', v_units, 'priceAdult', v_pa, 'priceChild', v_pc, 'priceTrip', v_pt,
    'standardAdult', v_ma, 'standardChild', v_mc, 'standardTrip', v_mt, 'standardSubtotal', v_std,
    'subtotal', v_sub, 'discount', v_disc, 'total', v_sub - v_disc, 'saving', v_std - (v_sub - v_disc),
    'offer', coalesce(v_group_label, ov.label), 'groupMin', v_group, 'code', v_code, 'codeOk', v_code_ok, 'codeMessage', v_msg,
    'optionName', r.ticket, 'experienceSlug', r.slug, 'experienceName', r.ename,
    'category', r.category, 'emirate', r.emirate, 'origins', r.origins,
    '_cost', v_cost, '_fee', s.fee * 100, '_ctype', v_ctype, '_cval', v_cval);
end $$;
revoke execute on function public._compute_quote(text, date, int, int, text) from public, anon, authenticated;

-- Bookings remember which group price applied.
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
    code, commission_share, commission_type, commission_value, offer_label, group_min)
  values (auth.uid(), v_name, v_email, v_phone, public._clean(p ->> 'university', 120), public._clean(p ->> 'pickup', 60),
    public._clean(p ->> 'notes', 1000),
    q ->> 'experienceSlug', q ->> 'experienceName', q ->> 'category', q ->> 'emirate', p ->> 'option', q ->> 'optionName', q ->> 'unit', v_date,
    (p ->> 'adults')::int, case when q ->> 'unit' = 'trip' then 0 else coalesce((p ->> 'children')::int, 0) end, (q ->> 'units')::int,
    (q ->> 'priceAdult')::numeric, (q ->> 'priceChild')::numeric, (q ->> 'priceTrip')::numeric, (q ->> 'subtotal')::numeric,
    (q ->> 'standardSubtotal')::numeric, (q ->> 'discount')::numeric, (q ->> 'total')::numeric, (q ->> '_cost')::numeric,
    (q ->> '_fee')::numeric, q ->> 'code', coalesce((q ->> '_cval')::numeric, 0), q ->> '_ctype', (q ->> '_cval')::numeric, q ->> 'offer',
    (q ->> 'groupMin')::int)
  returning ref into v_ref;

  return (q - '_cost' - '_fee' - '_ctype' - '_cval') || jsonb_build_object('ref', v_ref, 'date', v_date);
end $$;

-- Catalogue: each option carries its live group prices.
create or replace function public.get_catalogue() returns jsonb
language sql stable security definer set search_path = '' as $$
with s as (select fee_pct / 100.0 as fee, profit_floor as fl, tiers, site_discount_pct as d, show_standard_price,
                  google_reviews_url, google_write_review_url, content, whatsapp, support_email from public.settings where id = 1),
today as (select (now() at time zone 'Asia/Dubai')::date as d),
base as (
  select p.*, e.discount_pct, e.hidden,
    (select o from public.price_overrides o
      where o.option_key = p.option_key and o.active
        and (o.starts_on is null or o.starts_on <= p.period_end)
        and (o.ends_on is null or o.ends_on >= greatest(p.period_start, (select d from today)))
      order by o.created_at desc limit 1) as ov
  from public.price_rows p join public.experiences e on e.source_name = p.attraction
  where p.period_end >= (select d from today) and not e.hidden
),
ok as (
  select b.attraction, b.ticket, b.option_key, b.origins, b.period_start, b.period_end,
    b.rec_adult as ma, b.rec_child as mc, b.rec_trip as mt, (b.ov).label as offer,
    coalesce((b.ov).sell_adult, public._sell(b.rec_adult, b.cost_adult, coalesce(b.discount_pct, s.d), s.fee, case when b.rec_trip > 0 then 0 else s.fl end)) as a,
    coalesce((b.ov).sell_trip, public._sell(b.rec_trip, b.cost_trip, coalesce(b.discount_pct, s.d), s.fee, s.fl)) as t,
    case when b.rec_adult > 0 and b.rec_child > 0
          and b.rec_child * (1 - s.fee) - b.cost_child >= case when b.rec_trip > 0 then 0 else s.fl end
         then coalesce((b.ov).sell_child, public._sell(b.rec_child, b.cost_child, coalesce(b.discount_pct, s.d), s.fee, case when b.rec_trip > 0 then 0 else s.fl end)) end as c
  from base b cross join s
  where public._row_sellable(b.rec_adult, b.rec_trip, b.cost_adult, b.cost_trip, s.fee, s.fl)
),
orig as (
  select option_key, array_agg(distinct trim(o) order by trim(o)) as origins
  from ok, unnest(string_to_array(coalesce(ok.origins, ''), ',')) as o
  where trim(o) <> '' group by option_key
),
opts as (
  select ok.attraction, ok.option_key, min(ok.ticket) as name,
    jsonb_agg(jsonb_strip_nulls(jsonb_build_object('s', ok.period_start, 'e', ok.period_end, 'a', ok.a, 'c', ok.c, 't', ok.t,
      'ma', nullif(ok.ma, 0), 'mc', case when ok.c is not null then nullif(ok.mc, 0) end, 'mt', nullif(ok.mt, 0), 'o', ok.offer)) order by ok.period_start) as periods
  from ok group by ok.attraction, ok.option_key
),
grp as (
  select g.option_key, jsonb_agg(jsonb_strip_nulls(jsonb_build_object('n', g.min_guests, 'p', g.price_pp, 'l', g.label, 's', g.starts_on, 'e', g.ends_on)) order by g.min_guests) as groups
  from public.group_prices g
  where g.active and (g.ends_on is null or g.ends_on >= (select d from today))
  group by g.option_key
)
select jsonb_build_object(
  'generated', now(),
  'tiers', (select tiers from s),
  'showStandardPrice', (select show_standard_price from s),
  'reviewsUrl', (select google_reviews_url from s),
  'writeReviewUrl', (select google_write_review_url from s),
  'whatsapp', (select whatsapp from s),
  'email', (select support_email from s),
  'content', (select content from s),
  'experiences', coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', e.slug, 'src', e.source_name, 'name', e.name, 'cat', e.category, 'emirate', e.emirate,
      'blurb', e.blurb, 'img', e.image_key, 'imageUrl', e.image_url, 'imageCredit', e.image_credit, 'offer', e.offer_label,
      'featured', e.featured, 'sort', e.sort,
      'options', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('key', o.option_key, 'name', o.name,
                    'origins', coalesce(to_jsonb(g.origins), '[]'::jsonb), 'periods', o.periods, 'groups', gr.groups)))
                  from opts o left join orig g on g.option_key = o.option_key left join grp gr on gr.option_key = o.option_key
                  where o.attraction = e.source_name)
    ) order by e.sort, e.name)
    from public.experiences e
    where not e.hidden and exists (select 1 from opts o where o.attraction = e.source_name)
  ), '[]'::jsonb)
)
$$;

-- Admin pricing view: add each ticket's group prices.
create or replace view public.admin_option_pricing with (security_invoker = true) as
with s as (select fee_pct / 100.0 as fee, profit_floor as fl, site_discount_pct as d from public.settings where id = 1),
cur as (
  select distinct on (p.option_key) p.id, p.attraction, p.ticket, p.origins, p.period_start, p.period_end, p.rec_adult, p.rec_child, p.rec_trip,
    p.cost_adult, p.cost_child, p.cost_trip, p.option_key, p.imported_at, p.source_file, p.updated_at, p.updated_by
  from public.price_rows p
  where p.period_end >= (now() at time zone 'Asia/Dubai')::date
  order by p.option_key, (p.period_start <= (now() at time zone 'Asia/Dubai')::date) desc, p.period_start desc
)
select e.id as experience_id, e.slug as experience_slug, e.name as experience, e.category, e.hidden as experience_hidden,
  e.discount_pct as experience_discount, c.id as price_row_id, c.option_key, c.ticket, c.period_start, c.period_end,
  (select count(*) from public.price_rows p2 where p2.option_key = c.option_key and p2.period_end >= (now() at time zone 'Asia/Dubai')::date) as periods,
  case when c.rec_adult > 0 and c.rec_trip > 0 then 'person+trip' when c.rec_adult > 0 then 'person' else 'trip' end as unit,
  c.cost_adult, c.cost_child, c.cost_trip, c.rec_adult, c.rec_child, c.rec_trip, c.updated_at, c.updated_by, c.imported_at, c.source_file,
  ov.id as offer_id, ov.label as offer_label, ov.starts_on as offer_starts, ov.ends_on as offer_ends,
  ov.sell_adult as offer_adult, ov.sell_child as offer_child, ov.sell_trip as offer_trip,
  coalesce(e.discount_pct, s.d) as discount_pct,
  public._row_sellable(c.rec_adult, c.rec_trip, c.cost_adult, c.cost_trip, s.fee, s.fl) as sellable,
  s.fee * 100 as fee_pct, s.fl as floor,
  (select jsonb_agg(jsonb_build_object('n', g.min_guests, 'p', g.price_pp, 'label', g.label, 'starts', g.starts_on, 'ends', g.ends_on) order by g.min_guests)
     from public.group_prices g where g.option_key = c.option_key and g.active) as group_prices
from cur c
join public.experiences e on e.source_name = c.attraction
cross join s
left join lateral (
  select o.* from public.price_overrides o
  where o.option_key = c.option_key and o.active and (o.ends_on is null or o.ends_on >= (now() at time zone 'Asia/Dubai')::date)
  order by o.created_at desc limit 1
) ov on true;
