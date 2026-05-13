alter table public.listings
add column if not exists city text;

create index if not exists listings_city_idx
on public.listings (city);
