alter table public.seasons
  add column if not exists standings_score_cap numeric not null default 30
  check (standings_score_cap > 0);

comment on column public.seasons.standings_score_cap is
  'Maximum weekly score counted for league standings and Week 4 matchup comparisons. Raw/all-time statistics remain uncapped.';

update public.seasons
set standings_score_cap = 30
where standings_score_cap is null;
