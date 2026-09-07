alter table public.seasons
add column if not exists handicap_standard numeric not null default 27
check (handicap_standard > 0);

comment on column public.seasons.handicap_standard is
'Target raw-score standard used to calculate recommended monthly team handicaps.';
