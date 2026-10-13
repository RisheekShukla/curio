-- Curio initial schema.
-- Curated content is readable by signed-in users; private data is owner-only via RLS.
-- Only the service role (server-side, bypasses RLS) can write curated discoveries.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(display_preferences) = 'object' and pg_column_size(display_preferences) < 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- discoveries (curated content)
-- ---------------------------------------------------------------------------
create table public.discoveries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,100}$'),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 2000),
  category text not null check (category in (
    'science','space','nature','history','technology','engineering','psychology','geography','culture','mathematics'
  )),
  tags text[] not null default '{}',
  image_url text check (image_url is null or image_url ~ '^https://'),
  image_alt text,
  image_credit text,
  image_license text,
  image_license_url text,
  image_source_url text,
  starter_questions text[] not null default '{}',
  generated_questions text[] not null default '{}',
  source_title text,
  source_url text check (source_url is null or source_url ~ '^https://'),
  reading_minutes smallint not null default 2 check (reading_minutes between 1 and 60),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index discoveries_status_idx on public.discoveries (status);
create index discoveries_category_idx on public.discoveries (category);
create index discoveries_tags_idx on public.discoveries using gin (tags);

-- ---------------------------------------------------------------------------
-- interactions (append-only event log, kept separate from inferred interests)
-- ---------------------------------------------------------------------------
create table public.interactions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  event_type text not null check (event_type in (
    'impression','open','positive','negative','save','unsave','dismiss','starter_question','conversation_start'
  )),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) < 2048),
  created_at timestamptz not null default now()
);

create index interactions_user_created_idx on public.interactions (user_id, created_at desc);
create index interactions_user_discovery_idx on public.interactions (user_id, discovery_id);

-- ---------------------------------------------------------------------------
-- user_interests (inferred + explicit topic weights)
-- ---------------------------------------------------------------------------
create table public.user_interests (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null check (topic ~ '^(category|tag):[a-z0-9-]{1,40}$'),
  weight real not null check (weight between -1 and 1),
  source text not null default 'inferred' check (source in ('explicit', 'inferred')),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic)
);

-- ---------------------------------------------------------------------------
-- saved_discoveries (bookmarks)
-- ---------------------------------------------------------------------------
create table public.saved_discoveries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, discovery_id)
);

create index saved_discoveries_user_created_idx on public.saved_discoveries (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create index conversations_user_discovery_idx on public.conversations (user_id, discovery_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Denormalised owner so RLS checks stay cheap; must match the conversation owner (see policy).
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  is_mock boolean not null default false,
  suggestions text[] not null default '{}' check (cardinality(suggestions) <= 6),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_user_pinned_idx on public.messages (user_id, created_at desc) where pinned;

-- ---------------------------------------------------------------------------
-- updated_at triggers and profile bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger discoveries_updated_at before update on public.discoveries
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.discoveries enable row level security;
alter table public.interactions enable row level security;
alter table public.user_interests enable row level security;
alter table public.saved_discoveries enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Curated content: published rows readable by signed-in users. No write policies => service role only.
create policy "Published discoveries are readable" on public.discoveries
  for select to authenticated using (status = 'published');

create policy "Own profile: select" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Own profile: insert" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "Own profile: update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Interactions are an append-only log for users (they may delete their own history).
create policy "Own interactions: select" on public.interactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own interactions: insert" on public.interactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own interactions: delete" on public.interactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Own interests: all" on public.user_interests
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own saved: all" on public.saved_discoveries
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own conversations: all" on public.conversations
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own messages: select" on public.messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own messages: insert into own conversation" on public.messages
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy "Own messages: update" on public.messages
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own messages: delete" on public.messages
  for delete to authenticated using (user_id = (select auth.uid()));

-- Users may only toggle `pinned` on messages; content and authorship are immutable.
revoke update on public.messages from authenticated, anon;
grant update (pinned) on public.messages to authenticated;

-- Interactions are never edited.
revoke update on public.interactions from authenticated, anon;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
