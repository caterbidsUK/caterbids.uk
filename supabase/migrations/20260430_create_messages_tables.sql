create extension if not exists "pgcrypto";

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid null,
  seller_id uuid null,
  listing_id uuid null,
  platform text not null default 'caterbids',
  participant_name text not null,
  participant_avatar text null,
  listing_title text null,
  last_message text null,
  last_message_at timestamptz not null default now(),
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid null,
  sender_name text null,
  body text not null,
  platform text not null default 'caterbids',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_authenticated" on public.conversations;
drop policy if exists "conversations_insert_authenticated" on public.conversations;
drop policy if exists "conversations_update_authenticated" on public.conversations;
drop policy if exists "messages_select_authenticated" on public.messages;
drop policy if exists "messages_insert_authenticated" on public.messages;
drop policy if exists "messages_update_authenticated" on public.messages;

create policy "conversations_select_authenticated"
on public.conversations
for select
to authenticated
using (true);

create policy "conversations_insert_authenticated"
on public.conversations
for insert
to authenticated
with check (true);

create policy "conversations_update_authenticated"
on public.conversations
for update
to authenticated
using (true)
with check (true);

create policy "messages_select_authenticated"
on public.messages
for select
to authenticated
using (true);

create policy "messages_insert_authenticated"
on public.messages
for insert
to authenticated
with check (true);

create policy "messages_update_authenticated"
on public.messages
for update
to authenticated
using (true)
with check (true);

create index if not exists conversations_last_message_at_idx
on public.conversations(last_message_at desc);

create index if not exists messages_conversation_id_created_at_idx
on public.messages(conversation_id, created_at asc);
