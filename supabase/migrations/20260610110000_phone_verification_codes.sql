alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists phone_verified boolean default false,
  add column if not exists is_phone_verified boolean default false,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists phone_verification_code text,
  add column if not exists phone_verification_expires_at timestamptz,
  add column if not exists phone_verification_attempts integer not null default 0;

create index if not exists profiles_phone_verification_expires_at_idx
  on public.profiles (phone_verification_expires_at);
