alter table public.profiles
  add column if not exists full_name text;

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

grant select on public.seller_public_profiles to anon, authenticated;
