create extension if not exists "pgcrypto";

create table if not exists public.novel_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'โปรเจกต์นิยายใหม่',
  manuscript text not null default '',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.novel_chapters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.novel_projects(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  body text not null,
  selected boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.novel_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.novel_projects(id) on delete cascade,
  kind text not null check (kind in ('source', 'background', 'audio', 'subtitle', 'video')),
  storage_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.novel_projects enable row level security;
alter table public.novel_chapters enable row level security;
alter table public.novel_assets enable row level security;

drop policy if exists "users manage their novel projects" on public.novel_projects;
create policy "users manage their novel projects"
on public.novel_projects for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage chapters in their projects" on public.novel_chapters;
create policy "users manage chapters in their projects"
on public.novel_chapters for all to authenticated
using (exists (
  select 1 from public.novel_projects p
  where p.id = project_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.novel_projects p
  where p.id = project_id and p.user_id = auth.uid()
));

drop policy if exists "users manage assets in their projects" on public.novel_assets;
create policy "users manage assets in their projects"
on public.novel_assets for all to authenticated
using (exists (
  select 1 from public.novel_projects p
  where p.id = project_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.novel_projects p
  where p.id = project_id and p.user_id = auth.uid()
));

insert into storage.buckets (id, name, public)
values ('novel-studio', 'novel-studio', false)
on conflict (id) do nothing;

drop policy if exists "users read their novel studio files" on storage.objects;
create policy "users read their novel studio files"
on storage.objects for select to authenticated
using (bucket_id = 'novel-studio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users upload their novel studio files" on storage.objects;
create policy "users upload their novel studio files"
on storage.objects for insert to authenticated
with check (bucket_id = 'novel-studio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update their novel studio files" on storage.objects;
create policy "users update their novel studio files"
on storage.objects for update to authenticated
using (bucket_id = 'novel-studio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete their novel studio files" on storage.objects;
create policy "users delete their novel studio files"
on storage.objects for delete to authenticated
using (bucket_id = 'novel-studio' and (storage.foldername(name))[1] = auth.uid()::text);
