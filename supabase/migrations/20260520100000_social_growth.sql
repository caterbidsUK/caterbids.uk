alter table public.profiles
  add column if not exists social_links jsonb default '{}'::jsonb,
  add column if not exists connected_social_providers jsonb default '[]'::jsonb,
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_uidx
on public.profiles (referral_code)
where referral_code is not null;

create table if not exists public.social_share_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid null references public.listings(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  platform text not null,
  shared_url text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.social_share_events enable row level security;

drop policy if exists social_share_events_insert_anyone on public.social_share_events;
create policy social_share_events_insert_anyone
on public.social_share_events
for insert
to anon, authenticated
with check (true);

drop policy if exists social_share_events_select_own on public.social_share_events;
create policy social_share_events_select_own
on public.social_share_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists social_share_events_admin_read on public.social_share_events;
create policy social_share_events_admin_read
on public.social_share_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

create index if not exists social_share_events_listing_id_idx
on public.social_share_events (listing_id);

create index if not exists social_share_events_user_id_idx
on public.social_share_events (user_id);

create index if not exists social_share_events_platform_idx
on public.social_share_events (platform);

create index if not exists social_share_events_created_at_idx
on public.social_share_events (created_at desc);

create or replace view public.seller_public_profiles
as
select
  id,
  name,
  full_name,
  business,
  location,
  avatar_url,
  verified,
  email_verified,
  is_email_verified,
  phone_verified,
  is_phone_verified,
  verified_user_badge,
  seller_verification_level,
  government_id_verified,
  business_verified,
  stripe_connect_onboarding_complete,
  social_links,
  created_at
from public.profiles;

grant select on public.seller_public_profiles to anon, authenticated;
