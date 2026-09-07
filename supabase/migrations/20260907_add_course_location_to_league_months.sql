alter table public.league_months
add column if not exists course_location text null;

comment on column public.league_months.course_location is
'Display location for the monthly course, shown under the course name in Rules & Settings.';
