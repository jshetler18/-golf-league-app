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


## Version 12.20
- Bottom navigation label shortened from **My Reservations** to **Reservations**.
- My Team page removes the personal welcome line and keeps the league snapshot message.
- Team name is now a dropdown containing all active teams in the player's season.
- The player's own team is selected automatically when the page opens.
- Players can switch teams to view that team's standings, Cup points, handicap, latest round, Week 4 matchup, monthly scores, roster, tee assignments, and profile photos.
- Added `get_league_player_avatars()` RPC for approved users so roster photos can display while browsing other teams.


## Version 12.20 – My Team Championships & Tee Names
- Bottom navigation keeps the shortened **Reservations** label.
- Removed the league snapshot helper sentence from the top of My Team.
- Roster tee assignments now use official tee-box names: Forward Tees, Senior Tees, Middle Tees, Back Tees, and Tips.
- Added a Championships section above the roster with separate Cup Championship and Monthly Championship trophy counts.
- Championship totals follow the same historical team-name matching and trophy logic used on the Teams page.


## Version 12.21
- Adds a small colored circle before each roster player's tee-box name on My Team.
- Match Play now displays Cup points earned by each team once points have been awarded.


## Version 12.22
- Updated Match Play home icon to a head-to-head two-player design.
- Added a distinct two-conversation-bubble icon for League Chat.
- Kept the existing icon weight and visual theme.

## Version 12.23
- Snapshot shows the logged-in player's team, current course/month/week, monthly position, Cup position/points, and Week 4 opponent when available.
- Snapshot cells link directly to My Team, Monthly Standings, Cup Standings, and Match Play.
- Redesigned the Match Play icon with wider-separated player silhouettes and a centered VS-style badge so the faces no longer appear to touch.

## Version 12.23 revision
- Removed the Current League Snapshot from the player Home page at user request.
- Kept the revised Match Play head-to-head icon from Version 12.23.


### Version 12.23 final icon revision
- Home league snapshot remains removed.
- Match Play icon now contains only two separated player silhouettes with no symbol or object between them.

## Version 12.24 — Results History
- Redesigned the player Results page into a cleaner weekly league history.
- Players can choose a league month and switch between Weeks 1–4 with quick week tabs.
- Weekly results now show finishing place, raw Stableford, bonus birdies, bonus points, handicap, and official total.
- Week 4 results also show the opponent, match result, and Cup points once awarded.
- Added a monthly champion trophy banner when a monthly champion has been recorded.
- Added a posted-results status so players can quickly see whether a week is complete or still in progress.
- No database migration or new environment variables are required.


## Version 12.25 Results Leaderboard Trial
- Removed separate Week 1–4 result buttons.
- Results now show one monthly leaderboard with Week 1, Week 2, Week 3, Week 4 and Total columns.
- Week 4 match result and Cup points appear under the team name when available.
- Monthly Champion trophy uses the existing silver/grayscale monthly trophy style from the Teams page.
- This is a presentation-only trial and requires no database migration.


## Version 12.26
- Results leaderboard title now uses the selected month (for example, November Leaderboard).
- Removed the “Official totals” label above the leaderboard.
- On phones, Rank and Team stay frozen while players scroll horizontally through Week 1–4 and Total.


## Version 12.27
- Removed page-title text from the top player header globally; the logo/profile header no longer shows page names.
- Results page: removed “League history” above Results.
- Results page: removed the descriptive sentence under Results.
- Preserves the Version 12.26 leaderboard layout and frozen Rank/Team columns.

## Version 12.28 — Monthly Standings live race
- Reworked Monthly Standings as a live Weeks 1–3 seeding race instead of another week-by-week results table.
- Shows current rank, team, seeding rounds completed, monthly handicap, cumulative Weeks 1–3 total, and projected Week 4 seed.
- Logged-in player's team is highlighted with a MY TEAM badge.
- Rank and Team stay frozen on phones while scrolling horizontally.
- Added a compact Week 4 seeding progress card.
- No database migration or new environment variables required.


## Version 12.29
- The Results page is now the single Monthly Standings page.
- Monthly Standings keeps the month selector and full W1-W4 leaderboard so it also serves as past-results history.
- Removed the separate Results item from the Home menu.
- Removed the old Monthly Standings experience; /standings now redirects to /results for compatibility.
- Updated My Team and navigation links to use the combined Monthly Standings page.

## Version 12.30
- Monthly Standings note now explains that weekly values are official adjusted totals with handicaps included.
- Teams page roster numbers replaced by larger player profile photos, with a profile placeholder when no photo is uploaded.
- Added editable Rules Page management in Admin. Admins can change the Rules page title, add/remove/reorder sections, and edit each section's heading and text.
- Added `league_rules` database migration with public read access and admin-only write access.
- Restyled sign-in, account, and signed-out experiences to match the mobile league app branding and layout.


## Version 12.31
- Restores a clear Admin Login option on the app-styled sign-in screen. Admin Login verifies an approved admin role and sends administrators directly to /admin.
- Refreshes Cup Standings into a season leaderboard with a current leader card, month-by-month Cup points, total points, and frozen Rank/Team columns on phones.
- Keeps Match Play on the Cup page and now shows awarded points for both teams when available.
