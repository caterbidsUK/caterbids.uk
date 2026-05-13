create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  buyer_id uuid,
  seller_id uuid,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  item_title text,
  item_price numeric not null default 0,
  delivery_name text,
  delivery_price numeric not null default 0,
  total_price numeric not null default 0,
  payment_status text default 'pending',
  order_status text default 'payment_pending',
  delivery_status text default 'not_booked',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
on public.orders
for select
to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
);

drop policy if exists "Service role can manage orders" on public.orders;
create policy "Service role can manage orders"
on public.orders
for all
to service_role
using (true)
with check (true);

alter table public.listings
  add column if not exists status text default 'live';

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);
create index if not exists orders_listing_id_idx on public.orders (listing_id);
create index if not exists listings_status_idx on public.listings (status);
