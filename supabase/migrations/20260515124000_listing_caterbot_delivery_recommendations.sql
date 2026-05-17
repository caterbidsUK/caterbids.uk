alter table public.listings
  add column if not exists estimated_weight text,
  add column if not exists delivery_type text,
  add column if not exists pallet_delivery_recommended boolean default false,
  add column if not exists specialist_delivery_recommended boolean default false;

create index if not exists listings_pallet_delivery_recommended_idx
  on public.listings (pallet_delivery_recommended);

create index if not exists listings_specialist_delivery_recommended_idx
  on public.listings (specialist_delivery_recommended);
