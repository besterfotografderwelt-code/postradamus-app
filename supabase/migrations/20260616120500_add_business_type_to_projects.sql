alter table public.projects
add column if not exists business_type text not null default 'sonstiges';

update public.projects
set business_type = coalesce(nullif(business_type, ''), 'sonstiges')
where business_type is null or business_type = '';
