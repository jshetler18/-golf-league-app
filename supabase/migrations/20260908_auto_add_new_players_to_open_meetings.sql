-- v13.94 behavior is implemented server-side. This migration documents and preserves
-- the uniqueness guarantee used when synchronizing newly-added players into open meetings.
do $$ begin
  if not exists (select 1 from pg_constraint where conname='league_meeting_invitees_meeting_id_player_id_key') then
    alter table public.league_meeting_invitees add constraint league_meeting_invitees_meeting_id_player_id_key unique (meeting_id, player_id);
  end if;
end $$;
