-- Run this in the Supabase SQL editor before assigning storefront categories.
-- It lets products appear in the correct Handbags, Nightwear, Accessories,
-- and New stock sections across the admin, home page, and catalog page.

alter table public.products
add column if not exists category text;

update public.products
set category = 'Handbags'
where category is null
  and (
    name ilike '%handbag%' or
    name ilike '%bag%' or
    name ilike '%tote%' or
    name ilike '%satchel%' or
    name ilike '%crossbody%' or
    name ilike '%clutch%' or
    coalesce(description, '') ilike '%handbag%' or
    coalesce(description, '') ilike '%bag%' or
    coalesce(description, '') ilike '%tote%' or
    coalesce(description, '') ilike '%satchel%' or
    coalesce(description, '') ilike '%crossbody%' or
    coalesce(description, '') ilike '%clutch%'
  );

update public.products
set category = 'Nightwear'
where category is null
  and (
    name ilike '%nightwear%' or
    name ilike '%sleep%' or
    name ilike '%satin%' or
    name ilike '%robe%' or
    name ilike '%lounge%' or
    name ilike '%slip%' or
    coalesce(description, '') ilike '%nightwear%' or
    coalesce(description, '') ilike '%sleep%' or
    coalesce(description, '') ilike '%satin%' or
    coalesce(description, '') ilike '%robe%' or
    coalesce(description, '') ilike '%lounge%' or
    coalesce(description, '') ilike '%slip%'
  );

update public.products
set category = 'Accessories'
where category is null
  and (
    name ilike '%wallet%' or
    name ilike '%strap%' or
    name ilike '%accessory%' or
    name ilike '%jewelry%' or
    name ilike '%hair%' or
    name ilike '%hat%' or
    coalesce(description, '') ilike '%wallet%' or
    coalesce(description, '') ilike '%strap%' or
    coalesce(description, '') ilike '%accessory%' or
    coalesce(description, '') ilike '%jewelry%' or
    coalesce(description, '') ilike '%hair%' or
    coalesce(description, '') ilike '%hat%'
  );

alter table public.products
drop constraint if exists products_category_valid;

alter table public.products
add constraint products_category_valid
check (
  category is null or
  category in ('Handbags', 'Nightwear', 'Accessories', 'New stock')
);

notify pgrst, 'reload schema';
