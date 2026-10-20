-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Untitled',
  messages jsonb not null default '[]',
  files jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "own projects: select" on public.projects
  for select using (auth.uid() = user_id);
create policy "own projects: insert" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "own projects: update" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects: delete" on public.projects
  for delete using (auth.uid() = user_id);
