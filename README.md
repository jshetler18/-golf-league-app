# Tom Krise 19th Hole Indoor Golf League — Version 12.33

## Changes in 12.32
- Removed the separate Match Play item from the player Home menu. Match Play information remains available inside Cup Standings where it belongs.
- Added a new History item directly under Teams on the player Home menu.
- Rebuilt the History page in the same mobile app shell used by the rest of the player experience.
- History now shows:
  - Past Cup Champions for completed seasons.
  - All-Time Monthly Titles, combining the same team name across seasons.
  - A chronological Monthly Champions list beginning with November 2025.
  - New monthly champions automatically appear as they are recorded in `monthly_champions`, including the current season beginning in November.
- Monthly titles use the silver trophy treatment and Cup champions use the Cup trophy treatment already used elsewhere in the app.
- Added a History icon matching the existing Home menu icon style.

No Supabase schema changes or new environment variables are required for this version.


## Version 12.33
- Adds a Season Cup Standings section to History.
- Includes a season/year dropdown.
- Shows month-by-month Cup points and season total for every team.
- Defaults to the current active season and supports historical seasons beginning with 2025-2026.
- Rank and Team remain frozen on mobile while horizontally scrolling the monthly Cup points.

## v12.34
- All-Time Monthly Titles now displays one silver trophy for every monthly championship won.
- Monthly Champions always lists the current season first, with prior seasons beneath it newest-first.


## Version 12.35
- Tee-box indicators use square markers consistently.
- Teams roster shows player name with tee square + official tee name beneath, matching My Team.
- Admin Login appears directly below the regular Sign In button.
