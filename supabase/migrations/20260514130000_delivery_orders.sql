create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  buyer_id uuid,
  seller_id uuid,
  collection_postcode text,
  delivery_postcode text,
  pallet_size_name text,
  weight_kg numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  pallet_count integer,
  insurance_value numeric,
  selected_service_name text,
  selected_service_price numeric,
  estimated_delivery_time text,
  courier_provider text default 'Interparcel',
  delivery_status text not null default 'pending_payment',
  tail_lift_required boolean,
  forklift_available boolean,
  pallet_truck_available boolean,
  commercial_premises boolean,
  ground_floor_collection boolean,
  access_restrictions text,
  access_notes text,
  pallet_ready_confirmed boolean,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  tracking_number text,
  tracking_url text,
  courier_name text,
  courier_reference text,
  is_test boolean not null default false,
  paid_at timestamptz,
  requested_at timestamptz,
  booked_at timestamptz,
  collected_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.delivery_orders
  add column if not exists listing_id text,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists buyer_id uuid,
  add column if not exists seller_id uuid,
  add column if not exists collection_postcode text,
  add column if not exists delivery_postcode text,
  add column if not exists pallet_size_name text,
  add column if not exists weight_kg numeric,
  add column if not exists length_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists pallet_count integer,
  add column if not exists insurance_value numeric,
  add column if not exists selected_service_name text,
  add column if not exists selected_service_price numeric,
  add column if not exists estimated_delivery_time text,
  add column if not exists courier_provider text default 'Interparcel',
  add column if not exists delivery_status text not null default 'pending_payment',
  add column if not exists tail_lift_required boolean,
  add column if not exists forklift_available boolean,
  add column if not exists pallet_truck_available boolean,
  add column if not exists commercial_premises boolean,
  add column if not exists ground_floor_collection boolean,
  add column if not exists access_restrictions text,
  add column if not exists access_notes text,
  add column if not exists pallet_ready_confirmed boolean,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists courier_name text,
  add column if not exists courier_reference text,
  add column if not exists is_test boolean not null default false,
  add column if not exists paid_at timestamptz,
  add column if not exists requested_at timestamptz,
  add column if not exists booked_at timestamptz,
  add column if not exists collected_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'delivery_orders'
      and column_name = 'status'
  ) then
    execute $sql$
      update public.delivery_orders
      set delivery_status = status
      where status in (
        'pending_payment',
        'paid',
        'booking_requested',
        'courier_confirmed',
        'tracking_assigned',
        'collected',
        'delivered',
        'cancelled',
        'failed'
      )
    $sql$;
  end if;
end $$;

update public.delivery_orders
set delivery_status = 'pending_payment'
where delivery_status is null
  or delivery_status not in (
    'pending_payment',
    'paid',
    'booking_requested',
    'courier_confirmed',
    'tracking_assigned',
    'collected',
    'delivered',
    'cancelled',
    'failed'
  );

update public.delivery_orders
set is_test = false
where is_test is null;

alter table public.delivery_orders
  alter column delivery_status set not null,
  alter column courier_provider set default 'Interparcel',
  alter column delivery_status set default 'pending_payment',
  alter column is_test set default false,
  alter column is_test set not null;

alter table public.delivery_orders
  drop constraint if exists delivery_orders_delivery_status_check;

alter table public.delivery_orders
  add constraint delivery_orders_delivery_status_check check (
    delivery_status in (
      'pending_payment',
      'paid',
      'booking_requested',
      'courier_confirmed',
      'tracking_assigned',
      'collected',
      'delivered',
      'cancelled',
      'failed'
    )
  );

alter table public.orders
  add column if not exists delivery_order_id uuid references public.delivery_orders(id) on delete set null;

alter table public.delivery_orders enable row level security;

drop policy if exists "Buyers can view their delivery orders" on public.delivery_orders;
create policy "Buyers can view their delivery orders"
on public.delivery_orders
for select
to authenticated
using (buyer_id = auth.uid());

drop policy if exists "Sellers can view their delivery orders" on public.delivery_orders;
create policy "Sellers can view their delivery orders"
on public.delivery_orders
for select
to authenticated
using (seller_id = auth.uid());

drop policy if exists "Users can view their own delivery orders" on public.delivery_orders;
create policy "Users can view their own delivery orders"
on public.delivery_orders
for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "Authenticated users can insert own delivery orders" on public.delivery_orders;
create policy "Authenticated users can insert own delivery orders"
on public.delivery_orders
for insert
to authenticated
with check (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "Service role can update delivery orders" on public.delivery_orders;
create policy "Service role can update delivery orders"
on public.delivery_orders
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage delivery orders" on public.delivery_orders;
create policy "Service role can manage delivery orders"
on public.delivery_orders
for all
to service_role
using (true)
with check (true);

create index if not exists delivery_orders_order_id_idx on public.delivery_orders (order_id);
create index if not exists delivery_orders_listing_id_idx on public.delivery_orders (listing_id);
create index if not exists delivery_orders_buyer_id_idx on public.delivery_orders (buyer_id);
create index if not exists delivery_orders_seller_id_idx on public.delivery_orders (seller_id);
create index if not exists delivery_orders_stripe_session_idx on public.delivery_orders (stripe_checkout_session_id);
create index if not exists delivery_orders_delivery_status_idx on public.delivery_orders (delivery_status);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text unique not null,
  order_id uuid references public.orders(id) on delete set null,
  delivery_order_id uuid references public.delivery_orders(id) on delete set null,
  recipient_user_id uuid,
  recipient_email text,
  template text not null,
  subject text not null,
  body text not null,
  status text not null default 'prepared',
  provider text,
  sent_at timestamptz,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint email_events_status_check check (status in ('prepared', 'sent', 'failed', 'skipped'))
);

alter table public.email_events enable row level security;

drop policy if exists "Users can view their own email events" on public.email_events;
create policy "Users can view their own email events"
on public.email_events
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "Service role can manage email events" on public.email_events;
create policy "Service role can manage email events"
on public.email_events
for all
to service_role
using (true)
with check (true);

create index if not exists email_events_order_id_idx on public.email_events (order_id);
create index if not exists email_events_delivery_order_id_idx on public.email_events (delivery_order_id);
create index if not exists email_events_recipient_user_id_idx on public.email_events (recipient_user_id);
