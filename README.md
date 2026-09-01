# Tom Krise 19th Hole Golf League — Version 12.12

Version 12.12 adds account-to-player linking and team-specific messaging while preserving Version 12.11 reservation reminders and the existing mobile/PWA experience.

## New in 12.12

- Admin can link each approved user account to one active league player.
- Each league player can be linked to only one user account.
- Admin announcements can target **Everyone** or one specific league team.
- Team-only messages are protected by Supabase Row Level Security and appear only for signed-in users linked to a player on that team (admins can still view all messages).
- Team-only push notifications are sent only to registered devices belonging to linked approved users on the selected team.
- Player Messages marks targeted announcements as **Team Message**.
- Recent Admin announcements show whether the target was Everyone or a specific team.
- Existing everyone-announcements, direct-message push behavior, PWA notifications, and reservation reminders remain unchanged.

## Database change already applied

The production Supabase project now has `profiles.player_id` linked to `players.id`, a unique link per player, and an updated announcements read policy for team targeting.
