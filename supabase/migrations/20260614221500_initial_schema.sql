create extension if not exists pgcrypto;

do $$
begin
  create type public.project_language as enum ('DE', 'EN');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.project_status as enum (
    'brief',
    'selection',
    'sneak-peek',
    'copy',
    'export'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.output_type as enum (
    'blog',
    'instagram_caption',
    'hashtags',
    'reel_ideas',
    'gallery_description',
    'thank_you_email',
    'album_story'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.export_type as enum ('markdown', 'txt', 'csv', 'zip');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.job_status as enum ('pending', 'processing', 'completed', 'failed');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  website text not null default '',
  instagram_handle text not null default '',
  tone_of_voice text not null default '',
  language_preference public.project_language not null default 'DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  couple_name text not null,
  wedding_date date not null,
  location text not null,
  style text not null default '',
  special_notes text not null default '',
  desired_tone text not null default '',
  language public.project_language not null default 'DE',
  image_count integer not null default 0 check (image_count >= 0),
  uploaded_image_count integer not null default 0 check (uploaded_image_count >= 0),
  internal_notes text not null default '',
  status public.project_status not null default 'brief',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  thumbnail_path text,
  filename text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  output_type public.output_type not null,
  content_markdown text not null default '',
  content_text text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  export_type public.export_type not null,
  status public.job_status not null default 'pending',
  download_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_profile_date_idx
  on public.projects(profile_id, wedding_date desc);
create index if not exists project_images_project_sort_idx
  on public.project_images(project_id, sort_order);
create index if not exists project_images_project_favorite_idx
  on public.project_images(project_id, is_favorite);
create index if not exists project_outputs_project_type_idx
  on public.project_outputs(project_id, output_type);
create index if not exists export_jobs_project_status_idx
  on public.export_jobs(project_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists project_images_set_updated_at on public.project_images;
create trigger project_images_set_updated_at
before update on public.project_images
for each row execute function public.set_updated_at();

drop trigger if exists project_outputs_set_updated_at on public.project_outputs;
create trigger project_outputs_set_updated_at
before update on public.project_outputs
for each row execute function public.set_updated_at();

drop trigger if exists export_jobs_set_updated_at on public.export_jobs;
create trigger export_jobs_set_updated_at
before update on public.export_jobs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_uploaded_image_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_project_id uuid;
begin
  affected_project_id := coalesce(new.project_id, old.project_id);

  update public.projects
  set uploaded_image_count = (
    select count(*)::integer
    from public.project_images
    where project_id = affected_project_id
  )
  where id = affected_project_id;

  if tg_op = 'UPDATE' and old.project_id <> new.project_id then
    update public.projects
    set uploaded_image_count = (
      select count(*)::integer
      from public.project_images
      where project_id = old.project_id
    )
    where id = old.project_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists project_images_sync_count on public.project_images;
create trigger project_images_sync_count
after insert or delete or update of project_id on public.project_images
for each row execute function public.sync_uploaded_image_count();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.project_outputs enable row level security;
alter table public.export_jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects for select
to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects for insert
to authenticated
with check ((select auth.uid()) = profile_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects for delete
to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists "project_images_owner_all" on public.project_images;
create policy "project_images_owner_all"
on public.project_images for all
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_images.project_id
      and projects.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_images.project_id
      and projects.profile_id = (select auth.uid())
  )
);

drop policy if exists "project_outputs_owner_all" on public.project_outputs;
create policy "project_outputs_owner_all"
on public.project_outputs for all
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_outputs.project_id
      and projects.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_outputs.project_id
      and projects.profile_id = (select auth.uid())
  )
);

drop policy if exists "export_jobs_owner_all" on public.export_jobs;
create policy "export_jobs_owner_all"
on public.export_jobs for all
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = export_jobs.project_id
      and projects.profile_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = export_jobs.project_id
      and projects.profile_id = (select auth.uid())
  )
);

grant usage on schema public to authenticated;
grant usage on type public.project_language, public.project_status, public.output_type,
  public.export_type, public.job_status to authenticated;
grant select, insert, update, delete on public.profiles, public.projects,
  public.project_images, public.project_outputs, public.export_jobs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-previews',
  'wedding-previews',
  false,
  26214400,
  array['image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wedding_previews_select_own" on storage.objects;
create policy "wedding_previews_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'wedding-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.profile_id = (select auth.uid())
  )
);

drop policy if exists "wedding_previews_insert_own" on storage.objects;
create policy "wedding_previews_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'wedding-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.profile_id = (select auth.uid())
  )
);

drop policy if exists "wedding_previews_update_own" on storage.objects;
create policy "wedding_previews_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'wedding-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.profile_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'wedding-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.profile_id = (select auth.uid())
  )
);

drop policy if exists "wedding_previews_delete_own" on storage.objects;
create policy "wedding_previews_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'wedding-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.profile_id = (select auth.uid())
  )
);
