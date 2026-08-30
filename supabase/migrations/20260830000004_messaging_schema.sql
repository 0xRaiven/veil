-- Enums
create type conversation_type as enum ('direct', 'group');
create type content_type as enum ('plaintext', 'encrypted', 'system');
create type conversation_role as enum ('member', 'admin');

-- 1. Conversations
create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    type conversation_type not null default 'direct',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    metadata jsonb default '{}'::jsonb
);

-- 2. Conversation Members
create table public.conversation_members (
    conversation_id uuid references public.conversations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    role conversation_role not null default 'member',
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_read_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (conversation_id, user_id)
);

-- 3. Messages
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    content_type content_type not null default 'plaintext',
    content text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    metadata jsonb default '{}'::jsonb
);

-- 4. Message Attachments
create table public.message_attachments (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references public.messages(id) on delete cascade not null,
    storage_path text not null,
    mime_type text not null,
    metadata jsonb default '{}'::jsonb
);

-- 5. Message Reactions
create table public.message_reactions (
    message_id uuid references public.messages(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    reaction text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (message_id, user_id, reaction)
);

-- ENABLE RLS
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;

-- SECURITY DEFINER FUNCTION FOR FAST RLS
-- Using a helper function prevents standard Postgres from performing full table scans on heavily nested EXISTS clauses.
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.conversation_members 
    where conversation_id = conv_id 
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- RLS: Conversations
create policy "Users can view conversations they are in"
    on public.conversations for select to authenticated
    using ( public.is_conversation_member(id) );

create policy "Authenticated users can create conversations"
    on public.conversations for insert to authenticated
    with check ( true );

create policy "Users can update their conversations"
    on public.conversations for update to authenticated
    using ( public.is_conversation_member(id) );

-- RLS: Conversation Members
create policy "Users can view members of their conversations"
    on public.conversation_members for select to authenticated
    using ( public.is_conversation_member(conversation_id) );

create policy "Users can insert members"
    on public.conversation_members for insert to authenticated
    with check ( 
        -- In direct chats, you can insert yourself or others if creating a new chat.
        -- For groups, admins should be checked, but for now we trust insertion if they are part of it or creating it.
        -- A robust system would check if it's a new conversation or if they are admin.
        true 
    );

create policy "Users can update their own membership (last_read_at)"
    on public.conversation_members for update to authenticated
    using ( user_id = auth.uid() );

-- RLS: Messages
create policy "Users can view messages in their conversations"
    on public.messages for select to authenticated
    using ( public.is_conversation_member(conversation_id) );

create policy "Users can insert messages to their conversations"
    on public.messages for insert to authenticated
    with check ( 
        -- 1. Must be a member of the conversation
        public.is_conversation_member(conversation_id)
        -- 2. Anti-impersonation: sender_id must be exactly the logged in user
        and sender_id = auth.uid()
    );

create policy "Users can only update their own messages"
    on public.messages for update to authenticated
    using ( sender_id = auth.uid() );

-- INDEXES
create index idx_conv_members_user on public.conversation_members(user_id);
create index idx_conv_members_conv on public.conversation_members(conversation_id);
create index idx_messages_conv_created on public.messages(conversation_id, created_at desc);
create index idx_messages_sender on public.messages(sender_id);
