alter table public.teams
add column if not exists captain_player_id uuid null references public.players(id) on delete set null;

comment on column public.teams.captain_player_id is
'Player designated as captain for this team. Application enforces that the selected player belongs to the team.';
