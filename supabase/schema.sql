-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor).
-- Safe to run again: it only creates what is missing and recreates policies.

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null default 'Untitled',
  messages jsonb not null default '[]',
  files jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "own projects: select" on public.projects;
drop policy if exists "own projects: insert" on public.projects;
drop policy if exists "own projects: update" on public.projects;
drop policy if exists "own projects: delete" on public.projects;

create policy "own projects: select" on public.projects
  for select using (auth.uid() = user_id);
create policy "own projects: insert" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "own projects: update" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects: delete" on public.projects
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------- submissions
-- Form submissions from generated sites (contact, booking, newsletter, ...).
-- Anyone can submit (the site's visitors); only the project's owner can read or delete.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  form text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

drop policy if exists "anyone can submit" on public.submissions;
drop policy if exists "owners read submissions" on public.submissions;
drop policy if exists "owners delete submissions" on public.submissions;

create policy "anyone can submit" on public.submissions
  for insert to anon, authenticated with check (true);
create policy "owners read submissions" on public.submissions
  for select using (exists (select 1 from public.projects p where p.id = submissions.project_id and p.user_id = auth.uid()));
create policy "owners delete submissions" on public.submissions
  for delete using (exists (select 1 from public.projects p where p.id = submissions.project_id and p.user_id = auth.uid()));
