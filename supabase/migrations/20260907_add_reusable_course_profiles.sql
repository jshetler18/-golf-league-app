-- v13.66 reusable course library
create table if not exists public.course_profiles (
  id uuid primary key default gen_random_uuid(),
  course_name text not null,
  course_location text,
  bonus_hole_1 integer,
  bonus_hole_2 integer,
  bonus_birdie_value numeric not null default 0.1,
  elevation_ft integer not null default 2000,
  stimp_options text[] not null default array['10','11']::text[],
  gimmie_feet integer not null default 5,
  wind text not null default 'None',
  greens text not null default 'Normal',
  fairways text not null default 'Normal',
  mulligans boolean not null default false,
  pins_week_1 text not null default 'Thursday',
  pins_week_2 text not null default 'Friday',
  pins_week_3 text not null default 'Saturday',
  pins_week_4 text not null default 'Sunday',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.course_profile_tee_boxes (
  id uuid primary key default gen_random_uuid(),
  course_profile_id uuid not null references public.course_profiles(id) on delete cascade,
  tee_level text not null check (tee_level in ('turquoise','red','yellow','blue','black')),
  course_tee_color text not null,
  yardage integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_profile_id,tee_level)
);
alter table public.league_months add column if not exists course_profile_id uuid references public.course_profiles(id) on delete set null;
create index if not exists league_months_course_profile_id_idx on public.league_months(course_profile_id);
alter table public.course_profiles enable row level security;
alter table public.course_profile_tee_boxes enable row level security;
grant select on public.course_profiles to anon,authenticated;
grant select on public.course_profile_tee_boxes to anon,authenticated;
grant insert,update,delete on public.course_profiles to authenticated;
grant insert,update,delete on public.course_profile_tee_boxes to authenticated;
