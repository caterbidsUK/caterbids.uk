alter table public.orders
  add column if not exists delivery_provider text,
  add column if not exists delivery_quote_id text,
  add column if not exists delivery_postcode text,
  add column if not exists collection_postcode text,
  add column if not exists delivery_booking_reference text,
  add column if not exists delivery_tracking_number text,
  add column if not exists delivery_tracking_url text,
  add column if not exists delivery_label_url text,
  add column if not exists delivery_booked_at timestamptz;

create index if not exists orders_delivery_booking_reference_idx
on public.orders (delivery_booking_reference);

create index if not exists orders_delivery_tracking_number_idx
on public.orders (delivery_tracking_number);
