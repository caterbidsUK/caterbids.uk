-- Add CaterBot spec and source columns to listings table.
-- These are required for the spec-lookup route to persist data
-- and for the admin CaterBot review page to function.

alter table public.listings
  add column if not exists spec_plate_ocr_text      text,
  add column if not exists spec_brand               text,
  add column if not exists spec_model               text,
  add column if not exists spec_serial_number       text,
  add column if not exists depth_cm                 numeric,
  add column if not exists gross_weight_kg          numeric,
  add column if not exists manual_source_url        text,
  add column if not exists spec_source_url          text,
  add column if not exists manual_source_name       text,
  add column if not exists manual_source_type       text,
  add column if not exists manual_source_validated  boolean default false,
  add column if not exists manual_source_last_checked_at timestamptz,
  add column if not exists manual_source_match_notes text,
  add column if not exists ai_spec_confidence       text,
  add column if not exists specs_verified_by_seller boolean default false,
  add column if not exists source_rejected_by_seller boolean default false,
  add column if not exists delivery_type            text,
  add column if not exists pallet_delivery_recommended boolean default false,
  add column if not exists delivery_notes           text;

create index if not exists listings_spec_brand_idx
  on public.listings (spec_brand)
  where spec_brand is not null;

create index if not exists listings_ai_spec_confidence_idx
  on public.listings (ai_spec_confidence)
  where ai_spec_confidence is not null;
