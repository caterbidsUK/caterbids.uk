-- CaterBids listings are public marketplace inventory.
-- They must stay visible to logged-out buyers until the item is sold or removed.
alter table public.listings enable row level security;

drop policy if exists "listings_select_public_live" on public.listings;

create policy "listings_select_public_live"
on public.listings
for select
to anon, authenticated
using (true);
