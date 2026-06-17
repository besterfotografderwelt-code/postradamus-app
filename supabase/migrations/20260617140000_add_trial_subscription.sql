-- Migration: Trial/Subscription tracking
alter table public.profiles
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists plan text not null default 'none';

create or replace function public.start_trial(pid uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set trial_start = now(),
      trial_end = now() + interval '14 days',
      plan = 'trial',
      updated_at = now()
  where id = pid and plan = 'none';
  return found;
end;
$$;
