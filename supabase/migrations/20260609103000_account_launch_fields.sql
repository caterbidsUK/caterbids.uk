-- Launch account/profile fields for CaterBidsUK auth, dashboards and verification.
-- Additive only: keeps existing phone/business/role values used by older flows.

alter table public.profiles
  add column if not exists business_name text,
  add column if not exists account_type text not null default 'buyer',
  add column if not exists phone_number text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists verified_dealer boolean not null default false;

update public.profiles
set business_name = business
where business_name is null
  and business is not null;

update public.profiles
set phone_number = phone
where phone_number is null
  and phone is not null;

update public.profiles
set phone_verified_at = updated_at
where phone_verified_at is null
  and coalesce(phone_verified, false) = true
  and updated_at is not null;

update public.profiles
set account_type = case
  when role in ('seller', 'dealer') then 'seller'
  else 'buyer'
end
where account_type is null
   or account_type not in ('buyer', 'seller');

alter table public.profiles alter column role set default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_account_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('buyer', 'seller'));
  end if;
end $$;

create index if not exists profiles_account_type_idx
  on public.profiles (account_type);

create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_verified_dealer_idx
  on public.profiles (verified_dealer)
  where verified_dealer = true;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
     or current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  new.role := old.role;
  new.verified := old.verified;
  new.email_verified := old.email_verified;
  new.is_email_verified := old.is_email_verified;
  new.phone_verified := old.phone_verified;
  new.is_phone_verified := old.is_phone_verified;
  new.phone_verified_at := old.phone_verified_at;
  new.verification_level := old.verification_level;
  new.badge := old.badge;
  new.verified_user_badge := old.verified_user_badge;
  new.verified_dealer := old.verified_dealer;
  new.government_id_verified := old.government_id_verified;
  new.business_verified := old.business_verified;
  new.seller_verification_level := old.seller_verification_level;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_escalation on public.profiles;
create trigger prevent_profile_privilege_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();
