-- Record every seller-initiated price change on a listing.
-- Written by sellerUpdateListing whenever the price column changes value.
-- Immutable append-only table — no updates or deletes expected.

create table if not exists public.listing_price_history (
  id          uuid primary key default gen_random_uuid(),
  listing_id  text not null references public.listings(id) on delete cascade,
  seller_id   uuid not null references auth.users(id) on delete cascade,
  old_price   text not null,
  new_price   text not null,
  changed_at  timestamptz not null default now()
);

create index if not exists listing_price_history_listing_idx
  on public.listing_price_history (listing_id, changed_at desc);

create index if not exists listing_price_history_seller_idx
  on public.listing_price_history (seller_id, changed_at desc);

-- Only the service-role key and the owning seller should read their own rows.
alter table public.listing_price_history enable row level security;

create policy "sellers read own price history"
  on public.listing_price_history
  for select
  using (auth.uid() = seller_id);
