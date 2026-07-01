-- Tighten CaterBids messaging access so only conversation members can read/write threads.
-- This replaces earlier broad authenticated-user policies while preserving existing tables.

alter table public.messages
add column if not exists recipient_id uuid null;

alter table public.messages
add column if not exists message_text text null;

update public.messages
set message_text = body
where message_text is null and body is not null;

alter table public.messages
alter column body drop not null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_authenticated" on public.conversations;
drop policy if exists "conversations_insert_authenticated" on public.conversations;
drop policy if exists "conversations_update_authenticated" on public.conversations;
drop policy if exists "Allow authenticated users to read conversations" on public.conversations;
drop policy if exists "Allow authenticated users to insert conversations" on public.conversations;
drop policy if exists "Allow authenticated users to update conversations" on public.conversations;
drop policy if exists "conversations_select_members" on public.conversations;
drop policy if exists "conversations_insert_members" on public.conversations;
drop policy if exists "conversations_update_members" on public.conversations;

create policy "conversations_select_members"
on public.conversations
for select
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_insert_members"
on public.conversations
for insert
to authenticated
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "conversations_update_members"
on public.conversations
for update
to authenticated
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "messages_select_authenticated" on public.messages;
drop policy if exists "messages_insert_authenticated" on public.messages;
drop policy if exists "messages_update_authenticated" on public.messages;
drop policy if exists "Allow authenticated users to read messages" on public.messages;
drop policy if exists "Allow authenticated users to insert messages" on public.messages;
drop policy if exists "Allow authenticated users to update messages" on public.messages;
drop policy if exists "messages_select_members" on public.messages;
drop policy if exists "messages_insert_members" on public.messages;
drop policy if exists "messages_update_members" on public.messages;

create policy "messages_select_members"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
  )
);

create policy "messages_insert_members"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
  )
);

create policy "messages_update_members"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
  )
);

create index if not exists conversations_member_lookup_idx
on public.conversations(buyer_id, seller_id, last_message_at desc);

create index if not exists messages_recipient_unread_idx
on public.messages(recipient_id, conversation_id, is_read);
