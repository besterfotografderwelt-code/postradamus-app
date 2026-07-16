do $$
begin
  create type public.scheduled_post_status as enum ('scheduled', 'processing', 'published', 'failed', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  planned_post_id text,
  post_type text not null check (post_type in ('feed', 'carousel', 'story', 'reel')),
  caption text not null default '',
  media_urls text[] not null default '{}',
  video_urls text[] not null default '{}',
  uploaded_filenames text[] not null default '{}',
  instagram_account_id text not null default '',
  scheduled_at timestamptz not null,
  status public.scheduled_post_status not null default 'scheduled',
  attempts integer not null default 0,
  published_media_ids text[] not null default '{}',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts(status, scheduled_at);
create index if not exists scheduled_posts_profile_idx
  on public.scheduled_posts(profile_id, scheduled_at desc);

drop trigger if exists scheduled_posts_set_updated_at on public.scheduled_posts;
create trigger scheduled_posts_set_updated_at
before update on public.scheduled_posts
for each row execute function public.set_updated_at();

alter table public.scheduled_posts enable row level security;

drop policy if exists "scheduled_posts_select_own" on public.scheduled_posts;
create policy "scheduled_posts_select_own"
on public.scheduled_posts for select
to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists "scheduled_posts_insert_own" on public.scheduled_posts;
create policy "scheduled_posts_insert_own"
on public.scheduled_posts for insert
to authenticated
with check ((select auth.uid()) = profile_id);

drop policy if exists "scheduled_posts_update_own" on public.scheduled_posts;
create policy "scheduled_posts_update_own"
on public.scheduled_posts for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);
