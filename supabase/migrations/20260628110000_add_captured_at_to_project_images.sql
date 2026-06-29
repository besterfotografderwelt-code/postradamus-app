-- Add captured_at column for EXIF-based date grouping
alter table public.project_images
add column if not exists captured_at timestamptz;

comment on column public.project_images.captured_at is
  'EXIF capture date of the original image; used for date-based carousel grouping';
