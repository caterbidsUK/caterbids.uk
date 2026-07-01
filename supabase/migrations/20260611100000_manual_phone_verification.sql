alter table public.profiles
  add column if not exists phone_verification_method text default 'manual',
  add column if not exists phone_verification_status text default 'pending';

update public.profiles
set
  phone_verification_method = coalesce(phone_verification_method, 'manual'),
  phone_verification_status = case
    when coalesce(phone_verified, false) = true or coalesce(is_phone_verified, false) = true then 'verified'
    when phone_number is not null or phone is not null then coalesce(phone_verification_status, 'pending')
    else coalesce(phone_verification_status, 'pending')
  end;

do $$
begin
  alter table public.profiles
    add constraint profiles_phone_verification_status_check
    check (phone_verification_status in ('pending', 'verified', 'rejected'));
exception
  when duplicate_object then null;
end $$;

create index if not exists profiles_phone_verification_status_idx
  on public.profiles (phone_verification_status);
