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
