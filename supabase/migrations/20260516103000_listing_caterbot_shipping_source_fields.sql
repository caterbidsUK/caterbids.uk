alter table public.listings
  add column if not exists depth_cm numeric,
  add column if not exists estimated_weight_kg numeric,
  add column if not exists gross_weight_kg numeric,
  add column if not exists packed_width_cm numeric,
  add column if not exists packed_depth_cm numeric,
  add column if not exists packed_height_cm numeric,
  add column if not exists packed_dimensions text,
  add column if not exists shipping_class text,
  add column if not exists forklift_required boolean,
  add column if not exists two_person_lift_recommended boolean,
  add column if not exists shipping_confidence text,
  add column if not exists shipping_details_confirmed_by_seller boolean default false;

create index if not exists listings_shipping_confidence_idx
  on public.listings (shipping_confidence);
