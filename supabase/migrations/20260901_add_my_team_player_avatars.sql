-- Version 12.18: allow an approved signed-in player to read avatar URLs for members of their own linked team only.

create or replace function public.get_my_team_player_avatars()
returns table (player_id uuid, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id as player_id, pr.avatar_url
  from public.profiles me
  join public.players my_player on my_player.id = me.player_id
  join public.players p on p.team_id = my_player.team_id and p.is_active = true
  left join public.profiles pr on pr.player_id = p.id and pr.status = 'approved'
  where me.id = auth.uid()
    and me.status = 'approved';
$$;

revoke all on function public.get_my_team_player_avatars() from public;
revoke all on function public.get_my_team_player_avatars() from anon;
grant execute on function public.get_my_team_player_avatars() to authenticated;
