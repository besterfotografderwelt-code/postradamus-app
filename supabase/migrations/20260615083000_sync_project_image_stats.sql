alter table public.projects
  add column if not exists favorite_count integer not null default 0
    check (favorite_count >= 0),
  add column if not exists tag_count integer not null default 0
    check (tag_count >= 0);

create or replace function public.sync_project_image_stats()
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
  set uploaded_image_count = stats.uploaded_count,
      favorite_count = stats.favorite_count,
      tag_count = stats.tag_count,
      status = case
        when stats.uploaded_count > 0 and status = 'brief' then 'selection'::public.project_status
        else status
      end
  from (
    select
      count(*)::integer as uploaded_count,
      count(*) filter (where is_favorite)::integer as favorite_count,
      coalesce(sum(cardinality(tags)), 0)::integer as tag_count
    from public.project_images
    where project_id = affected_project_id
  ) stats
  where projects.id = affected_project_id;

  if tg_op = 'UPDATE' and old.project_id <> new.project_id then
    update public.projects
    set uploaded_image_count = stats.uploaded_count,
        favorite_count = stats.favorite_count,
        tag_count = stats.tag_count
    from (
      select
        count(*)::integer as uploaded_count,
        count(*) filter (where is_favorite)::integer as favorite_count,
        coalesce(sum(cardinality(tags)), 0)::integer as tag_count
      from public.project_images
      where project_id = old.project_id
    ) stats
    where projects.id = old.project_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists project_images_sync_count on public.project_images;
drop trigger if exists project_images_sync_stats on public.project_images;
create trigger project_images_sync_stats
after insert or delete or update of project_id, is_favorite, tags on public.project_images
for each row execute function public.sync_project_image_stats();

update public.projects
set uploaded_image_count = stats.uploaded_count,
    favorite_count = stats.favorite_count,
    tag_count = stats.tag_count,
    status = case
      when stats.uploaded_count > 0 and status = 'brief' then 'selection'::public.project_status
      else status
    end
from (
  select
    projects.id as project_id,
    count(project_images.id)::integer as uploaded_count,
    count(project_images.id) filter (where project_images.is_favorite)::integer as favorite_count,
    coalesce(sum(cardinality(project_images.tags)), 0)::integer as tag_count
  from public.projects
  left join public.project_images on project_images.project_id = projects.id
  group by projects.id
) stats
where projects.id = stats.project_id;
