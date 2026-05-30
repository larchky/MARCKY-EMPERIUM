-- Run this in the Supabase SQL editor before using giftable/event storefront edits.
-- These flags let admin place products into buyer-intent shelves.

alter table public.products
add column if not exists is_giftable boolean not null default false;

alter table public.products
add column if not exists is_event_pick boolean not null default false;

notify pgrst, 'reload schema';
