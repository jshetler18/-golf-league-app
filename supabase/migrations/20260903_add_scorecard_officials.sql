-- Allows the league admin to designate approved player accounts as Scorecard Officials.
alter table public.profiles
  add column if not exists is_scorecard_official boolean not null default false;
