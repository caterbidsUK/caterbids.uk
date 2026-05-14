create table if not exists public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  listing_id text not null,
  buyer_id uuid,
  seller_id uuid,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  collection_postcode text,
  delivery_postcode text,
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
  status text not null default 'pending_payment',
  courier_name text,
  courier_reference text,
  tracking_number text,
  tracking_url text,
  is_test boolean not null default false,
  paid_at timestamptz,
  requested_at timestamptz,
  booked_at timestamptz,
  collected_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint delivery_orders_status_check check (
    status in (
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
  )
);

alter table public.orders
  add column if not exists delivery_order_id uuid references public.delivery_orders(id) on delete set null;

alter table public.delivery_orders enable row level security;

drop policy if exists "Users can view their own delivery orders" on public.delivery_orders;
create policy "Users can view their own delivery orders"
on public.delivery_orders
for select
to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
);

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
create index if not exists delivery_orders_status_idx on public.delivery_orders (status);
create index if not exists delivery_orders_stripe_session_idx on public.delivery_orders (stripe_checkout_session_id);

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
