alter table public.messages
add column if not exists recipient_id uuid null;

alter table public.messages
add column if not exists message_text text null;

update public.messages
set message_text = body
where message_text is null and body is not null;

alter table public.messages
alter column body drop not null;

create index if not exists conversations_buyer_seller_listing_idx
on public.conversations(buyer_id, seller_id, listing_id);

create index if not exists messages_recipient_read_idx
on public.messages(recipient_id, is_read);
