-- Add JSONB column for catering trailer and food van specific fields.
-- Stored as NULL by default; populated only for listings in the
-- "Catering Vans & Trailers" category.
-- Partial GIN index so we can filter and query on JSONB keys without
-- indexing the NULL rows from all other categories.

alter table public.listings
  add column if not exists trailer_details jsonb default null;

create index if not exists listings_trailer_details_gin_idx
  on public.listings using gin (trailer_details)
  where trailer_details is not null;
