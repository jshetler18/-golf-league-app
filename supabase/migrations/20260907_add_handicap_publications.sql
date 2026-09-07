create table if not exists public.handicap_publications (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  league_month_id uuid not null unique references public.league_months(id) on delete cascade,
  month_start date not null,
  handicap_standard numeric not null,
  snapshot jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  published_by uuid null references auth.users(id) on delete set null
);
create index if not exists handicap_publications_season_published_idx on public.handicap_publications(season_id, published_at desc);
alter table public.handicap_publications enable row level security;
revoke all on table public.handicap_publications from anon, authenticated;
grant select on table public.handicap_publications to anon, authenticated;
grant all on table public.handicap_publications to service_role;
drop policy if exists "Handicap publications are readable" on public.handicap_publications;
create policy "Handicap publications are readable" on public.handicap_publications for select to anon, authenticated using (true);
