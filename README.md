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

## Version 12.14 — League Chat Notifications & Unread Badges
- Home screen League Chat unread-count badge for new visible posts/replies from other players.
- Opening League Chat marks currently visible chat activity as viewed.
- Push alerts for new Entire League posts, My Team posts, and replies.
- Entire League alerts target approved linked players; My Team alerts target that team only; replies target the original post author.
- Posters never notify themselves and reactions never generate push alerts.
- Notification taps deep-link to the chat post/reply.
- Settings includes a separate League Chat alert on/off preference without disabling official announcements or reservation reminders.
- Requires the `add_league_chat_unread_and_notification_preferences` Supabase migration (already applied to production when this package was prepared).


Hotfix 12.14.1: reply posting now verifies the parent message still exists, inherits the original message audience/team automatically, refreshes stale chat state, and shows a friendly message instead of a foreign-key error if the original post was removed.


Version 12.15: Reply boxes now open directly beneath the message being replied to, so players no longer need to scroll to the top. Nested replies remain visible in the thread.


## Version 12.16 — 7-Day League Chat Retention

- League Chat threads automatically delete after 7 days.
- Deleting an expired main post automatically removes its replies and reactions through database cascade rules.
- The cleanup runs automatically in Supabase Cron every hour; no player or admin action is required.
- League Chat now displays a note explaining the 7-day retention period.
- All Version 12.15 inline reply boxes, unread badges, reactions, team chat, and push notification features are preserved.
- The existing simulator reservation reminder Cron endpoint was corrected to `/api/reminders`.

## Version 12.17 — Personalized My Team Dashboard
- Added a new My Team item to the player home menu.
- Uses the signed-in account's player link to automatically identify the player's team.
- Shows current monthly position, Cup position/points, monthly handicap, and latest approved round.
- Shows all four monthly round scores, current course, Week 4 opponent/result, and team roster/tee assignments.
- Links directly to Monthly Standings, Match Play, and the full Teams page.
- No database migration or new environment variables are required.


## Version 12.18 – My Team navigation and roster photos
- Bottom navigation now reads Home / My Reservations / My Team / Messages.
- My Team was removed from the middle Home menu and moved to the bottom navigation.
- My Team page no longer shows a title beside the logo.
- Removed the Full Team List button from My Team.
- Team roster now uses each linked player's profile photo when available, with a generic profile fallback.
- Added `get_my_team_player_avatars()` RPC so approved players can see profile photos for their own team only.


## Version 12.19
- Bottom navigation label shortened from **My Reservations** to **Reservations**.
- My Team page removes the personal welcome line and keeps the league snapshot message.
- Team name is now a dropdown containing all active teams in the player's season.
- The player's own team is selected automatically when the page opens.
- Players can switch teams to view that team's standings, Cup points, handicap, latest round, Week 4 matchup, monthly scores, roster, tee assignments, and profile photos.
- Added `get_league_player_avatars()` RPC for approved users so roster photos can display while browsing other teams.
