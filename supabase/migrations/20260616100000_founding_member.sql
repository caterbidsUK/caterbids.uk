-- Extend seller_plans.type check to allow founding_member
alter table public.seller_plans
  drop constraint if exists seller_plans_type_check;
alter table public.seller_plans
  add constraint seller_plans_type_check
  check (type in ('single_pack', 'subscription', 'founding_member'));

-- cap column (null = uncapped; used by founding_member type only)
alter table public.seller_plans
  add column if not exists cap integer default null;

-- Seed the Founding Trade Member plan
insert into public.seller_plans (name, type, price, listing_count, duration_days, monthly, features, active, cap)
values (
  'Founding Trade Member',
  'founding_member',
  249,
  30,
  null,
  false,
  '["Lifetime access", "30 listings always active", "Trade-level tools", "Founding Member badge", "Priority support", "Capped at 100 accounts"]'::jsonb,
  true,
  100
)
on conflict (name) do update
set
  type = excluded.type,
  price = excluded.price,
  listing_count = excluded.listing_count,
  duration_days = excluded.duration_days,
  monthly = excluded.monthly,
  features = excluded.features,
  active = excluded.active,
  cap = excluded.cap,
  updated_at = now();

-- Single-row counter for the 100-slot cap.
-- Enforcement uses UPDATE WHERE sold < cap — atomic in Postgres, truly race-safe.
create table if not exists public.founding_member_counter (
  id integer primary key default 1 check (id = 1),
  cap integer not null default 100,
  sold integer not null default 0,
  constraint sold_within_cap check (sold <= cap)
);

insert into public.founding_member_counter (id, cap, sold)
values (1, 100, 0)
on conflict (id) do nothing;

-- Atomic slot claim: returns true if a slot was claimed, false if cap is reached.
-- Calling this from the webhook is the hard cap — two concurrent calls serialize on the single row.
create or replace function public.claim_founding_member_slot()
returns boolean
language plpgsql
security definer
as $$
declare
  updated_count integer;
begin
  update public.founding_member_counter
    set sold = sold + 1
    where sold < cap;
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

-- Founding member badge flag on profiles
alter table public.profiles
  add column if not exists is_founding_member boolean not null default false;

-- RLS: public can read the counter (for spot-count display); only service_role can write
alter table public.founding_member_counter enable row level security;

drop policy if exists founding_member_counter_public_read on public.founding_member_counter;
create policy founding_member_counter_public_read
  on public.founding_member_counter
  for select
  to anon, authenticated
  using (true);
