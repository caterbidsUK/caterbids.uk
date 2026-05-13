-- Run this in Supabase SQL editor if logged-out users cannot see CaterBids listings.
-- CaterBids listings are public marketplace inventory and should stay visible
-- until the item is sold or removed.
alter table public.listings enable row level security;

drop policy if exists "listings_select_public_live" on public.listings;

create policy "listings_select_public_live"
on public.listings
for select
to anon, authenticated
using (true);
