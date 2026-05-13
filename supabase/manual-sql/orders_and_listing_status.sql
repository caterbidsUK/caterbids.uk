-- Run this in Supabase SQL editor before testing Stripe webhook order creation.
-- This creates the order table and a real listings table for live/sold status.

create table if not exists public.listings (
  id text primary key,
  seller_id uuid,
  user_id uuid,
  title text not null,
  description text,
  price numeric not null default 0,
  location text,
  category text,
  subcategory text,
  delivery_method text default 'collection_only',
  condition text,
  power_type text,
  gas_type text,
  electrical_phase text,
  dimensions text,
  service_history text,
  warranty_type text,
  manuals_available boolean,
  tested_status text,
  delivery_option text,
  caterbids_delivery_available boolean default false,
  collection_full_address text,
  collection_postcode text,
  collection_city text,
  seller_contact_name text,
  seller_phone text,
  vat_included boolean,
  pallet_weight_kg numeric,
  pallet_length_cm numeric,
  pallet_width_cm numeric,
  pallet_height_cm numeric,
  pallet_count integer default 1,
  preferred_collection_date date,
  insurance_value numeric,
  access_restrictions text,
  delivery_notes text,
  delivery_details_confirmed boolean default false,
  ai_delivery_confidence numeric,
  manual_source_url text,
  spec_source_url text,
  manual_source_name text,
  manual_source_type text,
  manual_source_validated boolean default false,
  manual_source_last_checked_at timestamptz,
  manual_source_match_notes text,
  ai_spec_confidence text,
  specs_verified_by_seller boolean default false,
  specs_last_checked_at timestamptz,
  source_rejected_by_seller boolean default false,
  weight_kg numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  pallet_ready boolean default false,
  tail_lift_required boolean default false,
  forklift_available boolean default false,
  ground_floor_collection boolean default true,
  commercial_premises boolean default false,
  delivery_available boolean default false,
  image_url text,
  images text[] default '{}',
  city text,
  postcode text,
  status text not null default 'live',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sold_at timestamptz
);

alter table public.listings
  alter column price type text using price::text,
  alter column price set default '0';

alter table public.listings
  add column if not exists seller_id uuid,
  add column if not exists user_id uuid,
  add column if not exists description text,
  add column if not exists price numeric not null default 0,
  add column if not exists location text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists delivery_method text default 'collection_only',
  add column if not exists condition text,
  add column if not exists power_type text,
  add column if not exists gas_type text,
  add column if not exists electrical_phase text,
  add column if not exists dimensions text,
  add column if not exists service_history text,
  add column if not exists warranty_type text,
  add column if not exists manuals_available boolean,
  add column if not exists tested_status text,
  add column if not exists delivery_option text,
  add column if not exists caterbids_delivery_available boolean default false,
  add column if not exists collection_full_address text,
  add column if not exists collection_postcode text,
  add column if not exists collection_city text,
  add column if not exists seller_contact_name text,
  add column if not exists seller_phone text,
  add column if not exists vat_included boolean,
  add column if not exists pallet_weight_kg numeric,
  add column if not exists pallet_length_cm numeric,
  add column if not exists pallet_width_cm numeric,
  add column if not exists pallet_height_cm numeric,
  add column if not exists pallet_count integer default 1,
  add column if not exists preferred_collection_date date,
  add column if not exists insurance_value numeric,
  add column if not exists access_restrictions text,
  add column if not exists delivery_notes text,
  add column if not exists delivery_details_confirmed boolean default false,
  add column if not exists ai_delivery_confidence numeric,
  add column if not exists manual_source_url text,
  add column if not exists spec_source_url text,
  add column if not exists manual_source_name text,
  add column if not exists manual_source_type text,
  add column if not exists manual_source_validated boolean default false,
  add column if not exists manual_source_last_checked_at timestamptz,
  add column if not exists manual_source_match_notes text,
  add column if not exists ai_spec_confidence text,
  add column if not exists specs_verified_by_seller boolean default false,
  add column if not exists specs_last_checked_at timestamptz,
  add column if not exists source_rejected_by_seller boolean default false,
  add column if not exists weight_kg numeric,
  add column if not exists length_cm numeric,
  add column if not exists width_cm numeric,
  add column if not exists height_cm numeric,
  add column if not exists pallet_ready boolean default false,
  add column if not exists tail_lift_required boolean default false,
  add column if not exists forklift_available boolean default false,
  add column if not exists ground_floor_collection boolean default true,
  add column if not exists commercial_premises boolean default false,
  add column if not exists delivery_available boolean default false,
  add column if not exists image_url text,
  add column if not exists images text[] default '{}',
  add column if not exists city text,
  add column if not exists postcode text,
  add column if not exists status text not null default 'live',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists sold_at timestamptz;

update public.listings
set seller_id = coalesce(seller_id, user_id)
where seller_id is null and user_id is not null;

alter table public.listings enable row level security;

drop policy if exists "Anyone can view listings" on public.listings;
create policy "Anyone can view listings"
on public.listings
for select
using (true);

drop policy if exists "Sellers can manage own listings" on public.listings;
create policy "Sellers can manage own listings"
on public.listings
for all
to authenticated
using (seller_id = auth.uid() or user_id = auth.uid())
with check (seller_id = auth.uid() or user_id = auth.uid());

drop policy if exists "Service role can manage listings" on public.listings;
create policy "Service role can manage listings"
on public.listings
for all
to service_role
using (true)
with check (true);

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
  delivery_provider text,
  delivery_quote_id text,
  delivery_postcode text,
  collection_postcode text,
  delivery_booking_required boolean default false,
  delivery_booking_reference text,
  delivery_tracking_number text,
  delivery_tracking_url text,
  delivery_label_url text,
  delivery_collection_address text,
  delivery_dropoff_address text,
  buyer_delivery_full_address text,
  buyer_delivery_postcode text,
  buyer_phone text,
  buyer_access_restrictions text,
  collection_full_address text,
  collection_city text,
  seller_contact_name text,
  seller_phone text,
  pallet_weight_kg numeric,
  pallet_length_cm numeric,
  pallet_width_cm numeric,
  pallet_height_cm numeric,
  pallet_count integer default 1,
  forklift_available boolean default false,
  commercial_premises boolean default true,
  insurance_value numeric,
  access_restrictions text,
  delivery_notes text,
  delivery_booked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders
  add column if not exists delivery_provider text,
  add column if not exists delivery_quote_id text,
  add column if not exists delivery_postcode text,
  add column if not exists collection_postcode text,
  add column if not exists delivery_booking_required boolean default false,
  add column if not exists delivery_booking_reference text,
  add column if not exists delivery_tracking_number text,
  add column if not exists delivery_tracking_url text,
  add column if not exists delivery_label_url text,
  add column if not exists delivery_collection_address text,
  add column if not exists delivery_dropoff_address text,
  add column if not exists buyer_delivery_full_address text,
  add column if not exists buyer_delivery_postcode text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_access_restrictions text,
  add column if not exists collection_full_address text,
  add column if not exists collection_city text,
  add column if not exists seller_contact_name text,
  add column if not exists seller_phone text,
  add column if not exists pallet_weight_kg numeric,
  add column if not exists pallet_length_cm numeric,
  add column if not exists pallet_width_cm numeric,
  add column if not exists pallet_height_cm numeric,
  add column if not exists pallet_count integer default 1,
  add column if not exists forklift_available boolean default false,
  add column if not exists commercial_premises boolean default true,
  add column if not exists insurance_value numeric,
  add column if not exists access_restrictions text,
  add column if not exists delivery_notes text,
  add column if not exists delivery_booked_at timestamptz;

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

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);
create index if not exists orders_listing_id_idx on public.orders (listing_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_subcategory_idx on public.listings (subcategory);
create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_user_id_idx on public.listings (user_id);
