-- arredo3d: schema iniziale
-- Progetti, versioni della scena, chat, allegati, materioteca, render.
-- Tutte le tabelle hanno RLS: ogni utente vede solo i propri dati.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profili
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- progetti
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nuovo progetto',
  scene jsonb not null default '{}'::jsonb,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene jsonb not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  kind text not null default 'other'
    check (kind in ('plan', 'photo', 'composition', 'texture', 'model', 'other')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- materioteca
create table public.material_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.material_folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.material_folders(id) on delete set null,
  name text not null,
  albedo_path text,
  normal_path text,
  roughness_path text,
  color text,
  width_cm numeric not null default 100,
  height_cm numeric not null default 100,
  roughness numeric not null default 0.6,
  metalness numeric not null default 0,
  supplier text,
  sku text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- render
create table public.renders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('preview', 'static', 'pano', 'full')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'error')),
  camera jsonb,
  prompt text,
  image_path text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------- indici
create index projects_owner_idx on public.projects (owner_id, updated_at desc);
create index project_versions_project_idx on public.project_versions (project_id, created_at desc);
create index messages_project_idx on public.messages (project_id, created_at);
create index attachments_project_idx on public.attachments (project_id);
create index material_folders_owner_idx on public.material_folders (owner_id, parent_id);
create index materials_owner_idx on public.materials (owner_id, folder_id);
create index renders_project_idx on public.renders (project_id, created_at desc);

-- ---------------------------------------------------------------- trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.material_folders enable row level security;
alter table public.materials enable row level security;
alter table public.renders enable row level security;

create policy "profiles: own" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "projects: own" on public.projects
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "project_versions: via project" on public.project_versions
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "messages: via project" on public.messages
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "attachments: own" on public.attachments
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "material_folders: own" on public.material_folders
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "materials: own" on public.materials
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "renders: own" on public.renders
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('attachments', 'attachments', false, 52428800),
  ('materials', 'materials', false, 20971520),
  ('renders', 'renders', false, 52428800)
on conflict (id) do nothing;

-- Ogni file vive sotto una cartella con l'uuid dell'utente: <uid>/<file>
create policy "storage attachments: own folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage materials: own folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage renders: own folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);
