alter table public.profiles
  add column if not exists phone text,
  add column if not exists phone_verified boolean default false,
  add column if not exists is_phone_verified boolean default false,
  add column if not exists email_verified boolean default false,
  add column if not exists is_email_verified boolean default false,
  add column if not exists verification_level text default 'basic',
  add column if not exists badge text default 'Email pending',
  add column if not exists verified_user_badge boolean default false;

create index if not exists profiles_email_verified_idx on public.profiles (email_verified);
create index if not exists profiles_phone_verified_idx on public.profiles (phone_verified);
create index if not exists profiles_verification_level_idx on public.profiles (verification_level);
