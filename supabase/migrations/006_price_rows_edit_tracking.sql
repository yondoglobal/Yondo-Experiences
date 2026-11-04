-- Track when and by whom supplier prices were last changed, so admin shows "last updated" per ticket,
-- and expose the current price row id so prices can be edited from the admin.
alter table public.price_rows
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by text;
update public.price_rows set updated_at = coalesce(updated_at, imported_at, now());
alter table public.price_rows alter column updated_at set default now(), alter column updated_at set not null;
alter table public.price_rows add constraint price_rows_non_negative
  check (rec_adult >= 0 and rec_child >= 0 and rec_trip >= 0 and cost_adult >= 0 and cost_child >= 0 and cost_trip >= 0);

create or replace function public.tg_price_row_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', 'system');
  return new;
end $$;
drop trigger if exists price_rows_edit on public.price_rows;
create trigger price_rows_edit before update on public.price_rows for each row execute function public.tg_price_row_edit();
revoke execute on function public.tg_price_row_edit() from public, anon, authenticated;

-- admin_option_pricing was recreated with: experience_slug, price_row_id, periods, updated_at, updated_by, imported_at, source_file.
