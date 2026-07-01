alter table public.listings
  add column if not exists featured boolean default false,
  add column if not exists is_featured boolean default false,
  add column if not exists featured_until timestamptz,
  add column if not exists featured_type text default null;

create index if not exists listings_featured_live_idx
  on public.listings (featured, status, created_at desc);

create index if not exists listings_is_featured_live_idx
  on public.listings (is_featured, status, created_at desc);

create index if not exists listings_featured_until_idx
  on public.listings (featured_until)
  where featured_until is not null;
