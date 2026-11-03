-- Yondo Experiences: core schema
-- Public site reads selling prices only through security-definer RPCs. Supplier costs never leave the DB
-- except to admins.

create extension if not exists pgcrypto with schema extensions;

-- ---------- helpers
create or replace function public.yx_slug(s text) returns text
language sql immutable set search_path = '' as $$
  select left(trim(both '-' from regexp_replace(lower(regexp_replace(trim(coalesce(s,'')), '\s+', ' ', 'g')), '[^a-z0-9]+', '-', 'g')), 80)
$$;

create or replace function public.yx_ref(prefix text default 'YX') returns text
language sql volatile set search_path = '' as $$
  select prefix || '-' || string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1), '')
  from generate_series(1, 6)
$$;

-- ---------- settings (single row)
create table public.settings (
  id int primary key default 1 check (id = 1),
  fee_pct numeric not null default 5 check (fee_pct >= 0 and fee_pct < 50),
  profit_floor numeric not null default 5 check (profit_floor >= 0),
  default_discount_pct numeric not null default 5,
  default_commission_share numeric not null default 30,
  whatsapp text not null default '971503676042',
  support_email text not null default 'harrsh@yondo.global',
  tiers jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (id, tiers) values (1, '[
  {"id":"explorer","name":"Explorer","min":0,"perks":[{"text":"Your digital passport and badge collection","active":true}]},
  {"id":"trailblazer","name":"Trailblazer","min":3,"perks":[{"text":"Priority replies on WhatsApp","active":false},{"text":"Early access to new drops and group trips","active":false}]},
  {"id":"legend","name":"Legend","min":6,"perks":[{"text":"A free add-on on one booking","active":false},{"text":"Your own referral code","active":false}]},
  {"id":"icon","name":"Yondo Icon","min":10,"perks":[{"text":"Invite to a Yondo Originals night","active":false},{"text":"Name on the Wall of Legends","active":false}]}
]'::jsonb);

-- ---------- admins
create table public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
insert into public.admins (email) values ('harrsh@yondo.global');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

-- ---------- catalogue
create table public.experiences (
  id bigint generated always as identity primary key,
  slug text not null unique,
  source_name text not null unique,
  name text not null,
  category text not null,
  emirate text,
  blurb text,
  image_key text,
  image_url text,
  featured boolean not null default false,
  hidden boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_rows (
  id bigint generated always as identity primary key,
  attraction text not null,
  ticket text not null,
  origins text,
  period_start date not null,
  period_end date not null,
  rec_adult numeric not null default 0,
  rec_child numeric not null default 0,
  rec_trip numeric not null default 0,
  cost_adult numeric not null default 0,
  cost_child numeric not null default 0,
  cost_trip numeric not null default 0,
  option_key text generated always as (public.yx_slug(attraction) || '--' || public.yx_slug(ticket)) stored,
  imported_at timestamptz not null default now(),
  source_file text
);
create index price_rows_option_idx on public.price_rows (option_key, period_start, period_end);
create index price_rows_attraction_idx on public.price_rows (attraction);

create table public.price_imports (
  id bigint generated always as identity primary key,
  source_file text,
  row_count int,
  new_attractions text[],
  imported_by text,
  created_at timestamptz not null default now()
);

-- ---------- referral / promo codes
create table public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,24}$'),
  owner_name text not null,
  owner_contact text,
  kind text not null default 'ambassador' check (kind in ('ambassador','partner','campaign','customer')),
  customer_discount_pct numeric not null default 5 check (customer_discount_pct between 0 and 50),
  commission_share_pct numeric not null default 30 check (commission_share_pct between 0 and 100),
  active boolean not null default true,
  max_uses int,
  expires_at date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- customer profiles (passport)
create sequence public.passport_seq start 1001;
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  university text,
  phone text,
  passport_no text unique not null default ('YX' || to_char(now(), 'YY') || '-' || lpad(nextval('public.passport_seq')::text, 5, '0')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- booking requests
create table public.bookings (
  id bigint generated always as identity primary key,
  ref text not null unique default public.yx_ref('YX'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  phone text not null,
  university text,
  pickup text,
  notes text,
  experience_slug text not null,
  experience_name text not null,
  category text,
  emirate text,
  option_key text not null,
  option_name text not null,
  unit text not null check (unit in ('person','trip')),
  travel_date date not null,
  adults int not null default 1,
  children int not null default 0,
  price_adult numeric,
  price_child numeric,
  subtotal numeric not null,
  discount numeric not null default 0,
  total numeric not null,
  cost_total numeric not null,
  fee_pct numeric not null,
  code text references public.promo_codes (code) on update cascade,
  commission_share numeric not null default 0,
  status text not null default 'new' check (status in ('new','confirmed','paid','completed','cancelled')),
  payment_link text,
  admin_note text,
  confirmed_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  commission_paid_at timestamptz
);
create index bookings_email_idx on public.bookings (lower(email));
create index bookings_user_idx on public.bookings (user_id);
create index bookings_status_idx on public.bookings (status, created_at desc);
create index bookings_code_idx on public.bookings (code);

-- ---------- curated trip / quote requests
create table public.trip_requests (
  id bigint generated always as identity primary key,
  ref text not null unique default public.yx_ref('YQ'),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('yacht','desert','road-trip','group','custom')),
  title text,
  preferred_date date,
  group_size int,
  budget text,
  details text,
  name text not null,
  email text not null,
  phone text not null,
  university text,
  code text,
  status text not null default 'new' check (status in ('new','quoted','booked','closed')),
  admin_note text
);

-- ---------- waitlist (big group trips)
create table public.waitlist (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  university text,
  interest text,
  group_size int
);

-- ---------- updated_at + status timestamps
create or replace function public.tg_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger experiences_touch before update on public.experiences for each row execute function public.tg_touch();
create trigger profiles_touch before update on public.profiles for each row execute function public.tg_touch();

create or replace function public.tg_booking_status() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'confirmed' and new.confirmed_at is null then new.confirmed_at := now(); end if;
    if new.status = 'paid' and new.paid_at is null then new.paid_at := now(); end if;
    if new.status = 'completed' and new.completed_at is null then new.completed_at := now(); end if;
  end if;
  return new;
end $$;
create trigger bookings_status before update on public.bookings for each row execute function public.tg_booking_status();

-- new auth user -> profile
create or replace function public.tg_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, email) values (new.id, lower(new.email)) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.tg_new_user();

-- ---------- RLS
alter table public.settings enable row level security;
alter table public.admins enable row level security;
alter table public.experiences enable row level security;
alter table public.price_rows enable row level security;
alter table public.price_imports enable row level security;
alter table public.promo_codes enable row level security;
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.trip_requests enable row level security;
alter table public.waitlist enable row level security;

create policy settings_admin on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_admin on public.admins for select to authenticated using (public.is_admin());
create policy experiences_read on public.experiences for select to anon, authenticated using (true);
create policy experiences_admin_ins on public.experiences for insert to authenticated with check (public.is_admin());
create policy experiences_admin_upd on public.experiences for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy experiences_admin_del on public.experiences for delete to authenticated using (public.is_admin());
create policy price_rows_admin on public.price_rows for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy price_imports_admin on public.price_imports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy promo_admin on public.promo_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_own on public.profiles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy bookings_admin on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy trips_admin on public.trip_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy waitlist_admin on public.waitlist for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin reporting view (RLS of base table applies)
create view public.admin_bookings with (security_invoker = true) as
select b.*,
  round(b.total * (1 - b.fee_pct / 100.0) - b.cost_total, 2) as net_profit,
  round(case when b.code is not null then greatest(0, b.total * (1 - b.fee_pct / 100.0) - b.cost_total) * b.commission_share / 100.0 else 0 end, 2) as commission,
  round(b.total * (1 - b.fee_pct / 100.0) - b.cost_total
        - case when b.code is not null then greatest(0, b.total * (1 - b.fee_pct / 100.0) - b.cost_total) * b.commission_share / 100.0 else 0 end, 2) as yondo_net
from public.bookings b;

-- realtime for the admin inbox
alter publication supabase_realtime add table public.bookings, public.trip_requests;
