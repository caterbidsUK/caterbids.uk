alter table public.listings
add column if not exists images text[] default '{}';

update public.listings
set images = array[image_url]
where image_url is not null
and (images is null or array_length(images, 1) is null);
