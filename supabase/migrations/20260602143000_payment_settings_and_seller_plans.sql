create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  payments_enabled boolean not null default false,
  free_listing_mode boolean not null default true,
  free_listing_limit integer not null default 100,
  listing_packs_enabled boolean not null default true,
  subscriptions_enabled boolean not null default true,
  featured_boosts_enabled boolean not null default true,
  test_mode boolean not null default true,
  currency text not null default 'GBP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('single_pack', 'subscription')),
  price numeric not null default 0,
  listing_count integer not null default 1,
  duration_days integer,
  monthly boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_listing_entitlements (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.seller_plans(id) on delete set null,
  plan_name text not null,
  stripe_session_id text unique,
  stripe_subscription_id text,
  listing_count_total integer not null default 1,
  listing_count_used integer not null default 0,
  monthly boolean not null default false,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (listing_count_total >= 0),
  check (listing_count_used >= 0)
);

create or replace function public.update_payment_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_settings_updated_at on public.payment_settings;
create trigger payment_settings_updated_at
before update on public.payment_settings
for each row execute function public.update_payment_settings_updated_at();

drop trigger if exists seller_plans_updated_at on public.seller_plans;
create trigger seller_plans_updated_at
before update on public.seller_plans
for each row execute function public.update_payment_settings_updated_at();

drop trigger if exists seller_listing_entitlements_updated_at on public.seller_listing_entitlements;
create trigger seller_listing_entitlements_updated_at
before update on public.seller_listing_entitlements
for each row execute function public.update_payment_settings_updated_at();

insert into public.payment_settings (
  id,
  payments_enabled,
  free_listing_mode,
  free_listing_limit,
  listing_packs_enabled,
  subscriptions_enabled,
  featured_boosts_enabled,
  test_mode,
  currency
)
values (
  '00000000-0000-0000-0000-000000000001',
  false,
  true,
  100,
  true,
  true,
  true,
  true,
  'GBP'
)
on conflict (id) do update
set
  payments_enabled = public.payment_settings.payments_enabled,
  free_listing_mode = public.payment_settings.free_listing_mode,
  free_listing_limit = public.payment_settings.free_listing_limit,
  listing_packs_enabled = public.payment_settings.listing_packs_enabled,
  subscriptions_enabled = public.payment_settings.subscriptions_enabled,
  featured_boosts_enabled = public.payment_settings.featured_boosts_enabled,
  test_mode = public.payment_settings.test_mode,
  currency = public.payment_settings.currency;

insert into public.seller_plans (name, type, price, listing_count, duration_days, monthly, features, active)
values
  ('Single Listing', 'single_pack', 5, 1, 30, false, '["30 days live", "Up to 10 photos", "Buyer messages included"]'::jsonb, true),
  ('3 Listings Pack', 'single_pack', 12, 3, 30, false, '["Save £3", "For small clear-outs"]'::jsonb, true),
  ('10 Listings Pack', 'single_pack', 35, 10, 30, false, '["Save £15", "For trade sellers"]'::jsonb, true),
  ('Starter Plan', 'subscription', 9.99, 3, 30, true, '["3 listings included", "£4 extra listing"]'::jsonb, true),
  ('Pro Plan', 'subscription', 24.99, 10, 30, true, '["10 listings included", "AI listing tools", "1 featured boost"]'::jsonb, true),
  ('Trade Plan', 'subscription', 49.99, 30, 30, true, '["30 listings included", "Bulk tools", "Priority support"]'::jsonb, true)
on conflict (name) do update
set
  type = excluded.type,
  price = excluded.price,
  listing_count = excluded.listing_count,
  duration_days = excluded.duration_days,
  monthly = excluded.monthly,
  features = excluded.features,
  active = excluded.active,
  updated_at = now();

alter table public.payment_settings enable row level security;
alter table public.seller_plans enable row level security;
alter table public.seller_listing_entitlements enable row level security;

drop policy if exists "payment_settings_public_read" on public.payment_settings;
create policy "payment_settings_public_read"
on public.payment_settings
for select
to anon, authenticated
using (true);

drop policy if exists "seller_plans_public_read_active" on public.seller_plans;
create policy "seller_plans_public_read_active"
on public.seller_plans
for select
to anon, authenticated
using (active = true);

drop policy if exists "seller_entitlements_owner_read" on public.seller_listing_entitlements;
create policy "seller_entitlements_owner_read"
on public.seller_listing_entitlements
for select
to authenticated
using (auth.uid() = seller_id);
