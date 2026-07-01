create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  full_name text,
  business text,
  location text,
  phone text,
  seller_contact_name text,
  collection_full_address text,
  collection_city text,
  collection_postcode text,
  avatar_url text,
  verified boolean default false,
  email_verified boolean default false,
  is_email_verified boolean default false,
  phone_verified boolean default false,
  is_phone_verified boolean default false,
  verification_level text default 'basic',
  seller_verification_level text default 'none',
  badge text default 'Email pending',
  verified_user_badge boolean default false,
  auth_provider text,
  auth_providers jsonb default '[]'::jsonb,
  last_login_at timestamptz,
  role text default 'buyer',
  stripe_connect_onboarding_complete boolean default false,
  stripe_identity_session_id text,
  stripe_identity_status text,
  government_id_verified boolean default false,
  business_verified boolean default false,
  companies_house_number text,
  vat_number text,
  trust_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add column if not exists id uuid,
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists full_name text,
  add column if not exists business text,
  add column if not exists location text,
  add column if not exists phone text,
  add column if not exists seller_contact_name text,
  add column if not exists collection_full_address text,
  add column if not exists collection_city text,
  add column if not exists collection_postcode text,
  add column if not exists avatar_url text,
  add column if not exists verified boolean default false,
  add column if not exists email_verified boolean default false,
  add column if not exists is_email_verified boolean default false,
  add column if not exists phone_verified boolean default false,
  add column if not exists is_phone_verified boolean default false,
  add column if not exists verification_level text default 'basic',
  add column if not exists seller_verification_level text default 'none',
  add column if not exists badge text default 'Email pending',
  add column if not exists verified_user_badge boolean default false,
  add column if not exists auth_provider text,
  add column if not exists auth_providers jsonb default '[]'::jsonb,
  add column if not exists last_login_at timestamptz,
  add column if not exists role text default 'buyer',
  add column if not exists stripe_connect_onboarding_complete boolean default false,
  add column if not exists stripe_identity_session_id text,
  add column if not exists stripe_identity_status text,
  add column if not exists government_id_verified boolean default false,
  add column if not exists business_verified boolean default false,
  add column if not exists companies_house_number text,
  add column if not exists vat_number text,
  add column if not exists trust_notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.profiles alter column verified set default false;
alter table public.profiles alter column email_verified set default false;
alter table public.profiles alter column is_email_verified set default false;
alter table public.profiles alter column phone_verified set default false;
alter table public.profiles alter column is_phone_verified set default false;
alter table public.profiles alter column verification_level set default 'basic';
alter table public.profiles alter column seller_verification_level set default 'none';
alter table public.profiles alter column badge set default 'Email pending';
alter table public.profiles alter column verified_user_badge set default false;
alter table public.profiles alter column role set default 'buyer';
alter table public.profiles alter column stripe_connect_onboarding_complete set default false;
alter table public.profiles alter column government_id_verified set default false;
alter table public.profiles alter column business_verified set default false;
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'p'
  ) then
    alter table public.profiles add constraint profiles_pkey primary key (id);
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create table if not exists public.user_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_verified boolean not null default false,
  phone text,
  phone_verified boolean not null default false,
  phone_verified_at timestamptz,
  id_verification_provider text,
  id_verification_status text not null default 'not_started',
  id_verified boolean not null default false,
  id_verified_at timestamptz,
  business_name text,
  companies_house_number text,
  vat_number text,
  business_verification_status text not null default 'not_started',
  business_verified boolean not null default false,
  business_verified_at timestamptz,
  stripe_connect_account_id text,
  stripe_connect_onboarding_complete boolean not null default false,
  verification_consent_at timestamptz,
  verification_consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_verifications_id_status_check
    check (id_verification_status in ('not_started', 'pending', 'verified', 'rejected', 'failed')),
  constraint user_verifications_business_status_check
    check (business_verification_status in ('not_started', 'pending', 'companies_house_matched', 'verified', 'rejected', 'failed'))
);

create table if not exists public.seller_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  listing_id text,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  overall_rating smallint not null check (overall_rating between 1 and 5),
  communication_rating smallint not null check (communication_rating between 1 and 5),
  item_accuracy_rating smallint not null check (item_accuracy_rating between 1 and 5),
  delivery_rating smallint not null check (delivery_rating between 1 and 5),
  review_text text,
  verified_purchase boolean not null default true,
  seller_reply text,
  moderation_status text not null default 'published',
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_reviews_not_self_check check (buyer_id <> seller_id),
  constraint seller_reviews_moderation_status_check
    check (moderation_status in ('published', 'pending_review', 'removed', 'disputed'))
);

create table if not exists public.trust_badge_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  enabled boolean not null default true,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_badge_key_check
    check (badge_key in ('verified_user', 'id_verified', 'verified_business', 'top_rated', 'fast_responder', 'trusted_seller'))
);

create table if not exists public.trust_moderation_flags (
  id uuid primary key default gen_random_uuid(),
  flagged_user_id uuid references auth.users(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text,
  flag_type text not null,
  severity smallint not null default 1 check (severity between 1 and 5),
  status text not null default 'open',
  reason text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_flags_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed'))
);

create unique index if not exists user_verifications_user_id_unique_idx
on public.user_verifications (user_id);

create unique index if not exists seller_reviews_order_id_unique_idx
on public.seller_reviews (order_id);

create unique index if not exists trust_badge_overrides_user_badge_unique_idx
on public.trust_badge_overrides (user_id, badge_key);

create or replace function public.set_trust_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_verifications_updated_at on public.user_verifications;
create trigger user_verifications_updated_at
before update on public.user_verifications
for each row execute function public.set_trust_updated_at();

drop trigger if exists seller_reviews_updated_at on public.seller_reviews;
create trigger seller_reviews_updated_at
before update on public.seller_reviews
for each row execute function public.set_trust_updated_at();

drop trigger if exists trust_badge_overrides_updated_at on public.trust_badge_overrides;
create trigger trust_badge_overrides_updated_at
before update on public.trust_badge_overrides
for each row execute function public.set_trust_updated_at();

drop trigger if exists trust_moderation_flags_updated_at on public.trust_moderation_flags;
create trigger trust_moderation_flags_updated_at
before update on public.trust_moderation_flags
for each row execute function public.set_trust_updated_at();

create or replace function public.handle_new_user_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  user_name text;
  user_avatar text;
  user_provider text;
  email_is_verified boolean;
begin
  user_email := new.email;
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );
  user_avatar := new.raw_user_meta_data->>'avatar_url';
  user_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');
  email_is_verified := new.email_confirmed_at is not null;

  insert into public.profiles (
    id,
    email,
    name,
    full_name,
    avatar_url,
    verified,
    email_verified,
    is_email_verified,
    verification_level,
    badge,
    verified_user_badge,
    auth_provider,
    role,
    seller_verification_level,
    created_at,
    updated_at
  )
  values (
    new.id,
    user_email,
    user_name,
    user_name,
    user_avatar,
    email_is_verified,
    email_is_verified,
    email_is_verified,
    'basic',
    case when email_is_verified then 'Verified User' else 'Email pending' end,
    email_is_verified,
    user_provider,
    'buyer',
    'none',
    now(),
    now()
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    name = coalesce(public.profiles.name, excluded.name),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    verified = coalesce(public.profiles.verified, false) or coalesce(excluded.verified, false),
    email_verified = coalesce(public.profiles.email_verified, false) or coalesce(excluded.email_verified, false),
    is_email_verified = coalesce(public.profiles.is_email_verified, false) or coalesce(excluded.is_email_verified, false),
    verified_user_badge = coalesce(public.profiles.verified_user_badge, false) or coalesce(excluded.verified_user_badge, false),
    auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider),
    role = coalesce(public.profiles.role, excluded.role, 'buyer'),
    seller_verification_level = coalesce(public.profiles.seller_verification_level, excluded.seller_verification_level, 'none'),
    updated_at = now();

  insert into public.user_verifications (user_id, email_verified, created_at, updated_at)
  values (new.id, email_is_verified, now(), now())
  on conflict (user_id) do update set
    email_verified = coalesce(public.user_verifications.email_verified, false) or coalesce(excluded.email_verified, false),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_trust on auth.users;
create trigger on_auth_user_created_trust
after insert on auth.users
for each row execute function public.handle_new_user_trust();

create or replace view public.seller_review_stats
as
select
  seller_id,
  count(*)::integer as review_count,
  round(avg(overall_rating)::numeric, 2) as average_rating,
  round(avg(communication_rating)::numeric, 2) as communication_rating,
  round(avg(item_accuracy_rating)::numeric, 2) as item_accuracy_rating,
  round(avg(delivery_rating)::numeric, 2) as delivery_rating
from public.seller_reviews
where moderation_status = 'published'
group by seller_id;

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
  created_at
from public.profiles;

grant select on public.seller_review_stats to anon, authenticated;
grant select on public.seller_public_profiles to anon, authenticated;

alter table public.user_verifications enable row level security;
alter table public.seller_reviews enable row level security;
alter table public.trust_badge_overrides enable row level security;
alter table public.trust_moderation_flags enable row level security;

drop policy if exists "Users can view their own verification" on public.user_verifications;
create policy "Users can view their own verification"
on public.user_verifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own verification row" on public.user_verifications;
create policy "Users can create their own verification row"
on public.user_verifications
for insert
to authenticated
with check (
  auth.uid() = user_id
  and phone_verified = false
  and id_verified = false
  and business_verified = false
);

drop policy if exists "Published reviews are public" on public.seller_reviews;
create policy "Published reviews are public"
on public.seller_reviews
for select
to anon, authenticated
using (moderation_status = 'published');

drop policy if exists "Verified buyers can create their own reviews" on public.seller_reviews;
create policy "Verified buyers can create their own reviews"
on public.seller_reviews
for insert
to authenticated
with check (auth.uid() = buyer_id and verified_purchase = true);

drop policy if exists "Enabled badge overrides are public" on public.trust_badge_overrides;
create policy "Enabled badge overrides are public"
on public.trust_badge_overrides
for select
to anon, authenticated
using (enabled = true);

drop policy if exists "Users can create trust flags" on public.trust_moderation_flags;
create policy "Users can create trust flags"
on public.trust_moderation_flags
for insert
to authenticated
with check (auth.uid() = reporter_user_id);

drop policy if exists "Users can view flags they reported" on public.trust_moderation_flags;
create policy "Users can view flags they reported"
on public.trust_moderation_flags
for select
to authenticated
using (auth.uid() = reporter_user_id);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists user_verifications_user_id_idx on public.user_verifications (user_id);
create index if not exists user_verifications_phone_idx on public.user_verifications (phone) where phone is not null;
create index if not exists user_verifications_id_status_idx on public.user_verifications (id_verification_status);
create index if not exists user_verifications_business_status_idx on public.user_verifications (business_verification_status);
create index if not exists seller_reviews_seller_id_idx on public.seller_reviews (seller_id);
create index if not exists seller_reviews_buyer_id_idx on public.seller_reviews (buyer_id);
create index if not exists seller_reviews_order_id_idx on public.seller_reviews (order_id);
create index if not exists seller_reviews_listing_id_idx on public.seller_reviews (listing_id);
create index if not exists seller_reviews_moderation_status_idx on public.seller_reviews (moderation_status);
create index if not exists trust_badge_overrides_user_id_idx on public.trust_badge_overrides (user_id);
create index if not exists trust_moderation_flags_status_idx on public.trust_moderation_flags (status);
create index if not exists trust_moderation_flags_flagged_user_idx on public.trust_moderation_flags (flagged_user_id);
create index if not exists trust_moderation_flags_reporter_idx on public.trust_moderation_flags (reporter_user_id);
