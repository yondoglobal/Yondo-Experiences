-- Offers (fixed Yondo prices per ticket, optionally dated), commission types on referral codes,
-- admin-editable website content, a public media bucket for admin photo uploads,
-- the pricing workspace view and the Excel import preview.
-- (Migrations 003 and 004, combined person+vehicle pricing and "Yondo rate vs standard price",
-- were applied directly to the project; run `supabase db pull` for the full current schema.)

-- ---------- commission types on codes and bookings
alter table public.promo_codes
  add column if not exists commission_type text not null default 'profit_pct'
    check (commission_type in ('profit_pct','sale_pct','fixed_ticket','fixed_booking')),
  add column if not exists commission_value numeric;
update public.promo_codes set commission_value = commission_share_pct where commission_value is null;
alter table public.bookings
  add column if not exists commission_type text,
  add column if not exists commission_value numeric,
  add column if not exists units int,
  add column if not exists offer_label text;

-- ---------- offers
create table if not exists public.price_overrides (
  id bigint generated always as identity primary key,
  option_key text not null,
  label text,
  sell_adult numeric,
  sell_child numeric,
  sell_trip numeric,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists price_overrides_option_idx on public.price_overrides (option_key);
alter table public.price_overrides enable row level security;
create policy overrides_admin on public.price_overrides for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger price_overrides_touch before update on public.price_overrides for each row execute function public.tg_touch();

alter table public.experiences add column if not exists image_credit text, add column if not exists offer_label text;
alter table public.settings add column if not exists content jsonb not null default '{}'::jsonb;

-- ---------- media bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
create policy media_read on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy media_admin_ins on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_upd on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy media_admin_del on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

create or replace function public._override_for(p_option text, p_date date) returns public.price_overrides
language sql stable security definer set search_path = '' as $$
  select o.* from public.price_overrides o
  where o.option_key = p_option and o.active
    and (o.starts_on is null or o.starts_on <= p_date) and (o.ends_on is null or o.ends_on >= p_date)
  order by o.created_at desc limit 1
$$;
revoke execute on function public._override_for(text, date) from public, anon, authenticated;

-- get_catalogue, _compute_quote, quote_booking and request_booking were replaced in this migration to apply offers,
-- return site content and photo credits, and cap code discounts by commission type. Current definitions:
-- see the live project (Database > Functions) or `supabase db pull`.

-- ---------- reporting views (commission by type)
drop view if exists public.admin_code_stats;
drop view if exists public.admin_bookings;
create view public.admin_bookings with (security_invoker = true) as
with x as (
  select b.*, round(b.total * (1 - b.fee_pct / 100.0) - b.cost_total, 2) as net_profit,
    round(b.total * b.fee_pct / 100.0, 2) as fee_amount
  from public.bookings b
), c as (
  select x.*, round(case when x.code is null then 0
    else case coalesce(x.commission_type, 'profit_pct')
      when 'sale_pct' then x.total * coalesce(x.commission_value, 0) / 100.0
      when 'fixed_ticket' then coalesce(x.commission_value, 0) * coalesce(x.units, x.adults + x.children)
      when 'fixed_booking' then coalesce(x.commission_value, 0)
      else greatest(0, x.net_profit) * coalesce(x.commission_value, x.commission_share, 0) / 100.0 end end, 2) as commission
  from x
)
select c.*, round(c.net_profit - c.commission, 2) as yondo_net,
  case when c.total > 0 then round(100 * (c.net_profit - c.commission) / c.total, 1) end as margin_pct
from c;

create view public.admin_code_stats with (security_invoker = true) as
select pc.code, pc.owner_name, pc.owner_contact, pc.kind, pc.customer_discount_pct, pc.commission_share_pct,
  pc.commission_type, coalesce(pc.commission_value, pc.commission_share_pct) as commission_value,
  pc.active, pc.max_uses, pc.expires_at, pc.notes, pc.created_at,
  count(b.id) filter (where b.status <> 'cancelled') as uses,
  coalesce(sum(b.total) filter (where b.status in ('paid','completed')), 0) as revenue,
  coalesce(sum(b.discount) filter (where b.status in ('paid','completed')), 0) as discounts_given,
  coalesce(sum(b.commission) filter (where b.status in ('paid','completed') and b.commission_paid_at is null), 0) as commission_owed,
  coalesce(sum(b.commission) filter (where b.commission_paid_at is not null), 0) as commission_paid
from public.promo_codes pc
left join public.admin_bookings b on b.code = pc.code
group by pc.code;

-- admin_option_pricing (pricing workspace) and admin_preview_prices (import preview) were created here too.
