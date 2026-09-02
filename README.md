# Golf League App v12.38

Admin usability update:
- Messages: Viewed Players now lists every approved non-admin player. Viewed players show a green check, darker name, and view timestamp; players who have not viewed the message are gray and show Not viewed.
- Simulator: Add League Reservation and Block Simulator Time stay at the top. Upcoming bookings use a compact table with 7-day, 30-day, all-upcoming, specific-date filters, and pagination.
- League Setup & Scoring: Monthly Setup, Weekly Scoring, and Week 4 & Cup are separated into a tabbed workspace so only one work area is shown at a time.


## Version 12.39
- Reserve Sim now confirms successful reservations in a centered popup while keeping the existing confirmation sound.
- Player Home menu is ~20% more compact, removes all subtitle text, uses smaller icons/titles, and titles are no longer bold.
- Home profile control sits at the lower-right of the header area.
- Teams page removes the redundant tee-box key while keeping each player's tee designation.

## v12.40
- Booking confirmation popup now uses a fixed three-line confirmation format with full weekday/month names and ordinal dates.
- Reminder investigation confirmed the Supabase cron is running every 5 minutes, but the live reminder endpoint is returning HTTP 401 Unauthorized. The Vercel CRON_SECRET must be synchronized with the token used by the Supabase cron job.

## Version 12.41
- Added season-long weekly 3-hour simulator blocks for each active league team.
- Admin Simulator page now shows every team as Set Up or Not Set Up with its recurring weekday/time.
- Setting a team block automatically creates weekly league reservations for the active season.
- Editing a team block rebuilds future recurring reservations; clearing it removes future recurring reservations.
- Recurring team blocks automatically appear on the player Reserve Sim calendar with the team name and prevent overlapping personal reservations.

## v12.42
Redesigned Admin Simulator into Team Schedules, League Make-Up Blocks, and Bookings & Block Time. Team schedules support custom start/end dates and future-only rebuilds.
