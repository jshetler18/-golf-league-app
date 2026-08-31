-- Starter schema for the indoor golf league. Run only after review.
create extension if not exists pgcrypto;

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_year int not null,
  end_year int not null,
  is_active boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.season_team_rosters (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (season_id, team_id, player_id)
);

create table if not exists public.months (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  month_number int not null check (month_number between 1 and 6),
  month_name text not null check (month_name in ('November','December','January','February','March','April')),
  course_name text not null,
  bonus_hole_1 int not null check (bonus_hole_1 between 11 and 18),
  bonus_hole_2 int not null check (bonus_hole_2 between 11 and 18),
  elevation_feet int not null default 2000,
  stimp_choice text not null default '10 or 11',
  gimmie_feet numeric(4,1) not null default 5,
  wind text not null default 'None',
  greens text not null default 'Normal',
  fairways text not null default 'Normal',
  mulligans boolean not null default false,
  unique (season_id, month_number)
);

create table if not exists public.monthly_team_handicaps (
  month_id uuid not null references public.months(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  handicap_points numeric(6,2) not null default 0,
  primary key (month_id, team_id)
);

create table if not exists public.monthly_player_tees (
  month_id uuid not null references public.months(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  tee_color text not null check (tee_color in ('turquoise','red','green','yellow','gray','blue','black')),
  yardage int not null check (yardage > 0),
  primary key (month_id, player_id)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  week_number int not null check (week_number between 1 and 4),
  team_id uuid not null references public.teams(id) on delete cascade,
  raw_stableford numeric(7,2) not null default 0,
  bonus_birdies int not null default 0 check (bonus_birdies between 0 and 2),
  bonus_points numeric(7,2) not null default 0,
  handicap_points numeric(7,2) not null default 0,
  official_total numeric(7,2) generated always as (raw_stableford + bonus_points + handicap_points) stored,
  status text not null default 'pending' check (status in ('pending','approved','needs_review','overridden')),
  unique (month_id, week_number, team_id)
);

create table if not exists public.cup_results (
  month_id uuid not null references public.months(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  cup_points int not null default 0,
  final_month_rank int,
  is_monthly_champion boolean not null default false,
  primary key (month_id, team_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience_team_id uuid references public.teams(id) on delete cascade,
  send_push boolean not null default true,
  is_pinned boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.season_team_rosters enable row level security;
alter table public.months enable row level security;
alter table public.monthly_team_handicaps enable row level security;
alter table public.monthly_player_tees enable row level security;
alter table public.rounds enable row level security;
alter table public.cup_results enable row level security;
alter table public.announcements enable row level security;

-- Public read policies for league-facing data. Admin write policies will be added with Auth.
create policy "public read seasons" on public.seasons for select to anon, authenticated using (true);
create policy "public read teams" on public.teams for select to anon, authenticated using (true);
create policy "public read players" on public.players for select to anon, authenticated using (true);
create policy "public read rosters" on public.season_team_rosters for select to anon, authenticated using (true);
create policy "public read months" on public.months for select to anon, authenticated using (true);
create policy "public read handicaps" on public.monthly_team_handicaps for select to anon, authenticated using (true);
create policy "public read tees" on public.monthly_player_tees for select to anon, authenticated using (true);
create policy "public read rounds" on public.rounds for select to anon, authenticated using (true);
create policy "public read cup results" on public.cup_results for select to anon, authenticated using (true);
create policy "public read announcements" on public.announcements for select to anon, authenticated using (true);
