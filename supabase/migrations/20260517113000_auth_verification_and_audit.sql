-- Fast CaterBidsUK login and verification metadata.
-- Additive only: keeps existing profiles, listings, checkout, delivery and messages intact.

alter table public.profiles
  add column if not exists email text,
  add column if not exists email_verified boolean not null default false,
  add column if not exists verification_level text not null default 'basic',
  add column if not exists badge text not null default 'Verified User',
  add column if not exists auth_provider text,
  add column if not exists auth_providers jsonb not null default '[]'::jsonb,
  add column if not exists last_login_at timestamptz,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists stripe_connect_onboarding_complete boolean not null default false,
  add column if not exists government_id_verified boolean not null default false,
  add column if not exists business_verified boolean not null default false,
  add column if not exists seller_verification_level text not null default 'unverified';

create table if not exists public.auth_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.auth_login_events enable row level security;

drop policy if exists "Users can view their own login events" on public.auth_login_events;
create policy "Users can view their own login events"
on public.auth_login_events
for select
to authenticated
using (user_id = auth.uid());

create index if not exists auth_login_events_user_id_created_at_idx
  on public.auth_login_events (user_id, created_at desc);

create index if not exists profiles_verification_level_idx
  on public.profiles (verification_level);

create index if not exists profiles_seller_verification_level_idx
  on public.profiles (seller_verification_level);

create index if not exists profiles_email_lookup_idx
  on public.profiles (lower(email))
  where email is not null;
