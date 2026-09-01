-- Version 12.19: allow approved signed-in players to view profile photos for active players in their league season.

create or replace function public.get_league_player_avatars()
returns table (player_id uuid, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id as player_id, pr.avatar_url
  from public.profiles me
  join public.players my_player on my_player.id = me.player_id
  join public.players p on p.season_id = my_player.season_id and p.is_active = true
  left join public.profiles pr on pr.player_id = p.id and pr.status = 'approved'
  where me.id = auth.uid()
    and me.status = 'approved';
$$;

revoke all on function public.get_league_player_avatars() from public;
revoke all on function public.get_league_player_avatars() from anon;
grant execute on function public.get_league_player_avatars() to authenticated;
