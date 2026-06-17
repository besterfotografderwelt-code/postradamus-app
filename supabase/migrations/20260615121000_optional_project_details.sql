alter table public.projects
  alter column couple_name drop not null,
  alter column wedding_date drop not null,
  alter column location drop not null;
