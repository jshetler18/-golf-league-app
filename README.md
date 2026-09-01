Version 11.2

TV leaderboard viewport fix: reserves a larger right-side safe area and makes the month/year + week panel responsive so it cannot be clipped off-screen.

Version 10.2

Changes:
- Removed the per-team player-count pill from the player-facing Teams page.
- Keeps Version 10.1 signup/admin approval messaging and all prior features.

# Tom Krise 19th Hole Golf Simulator — Version 10

Version 10 adds a player-facing Weekly Results page while retaining all Version 9.6 booking, Teams/Rosters, trophy, league scoring, Cup, history, and admin features.

## New in Version 10
- `/results` Weekly Results page
- Month selector and Week 1–4 selector
- Read-only score breakdown for every active team:
  - Raw Stableford
  - Bonus birdies
  - Bonus points
  - Monthly handicap
  - Adjusted official total
- Week 4 automatically shows opponent and result status
- Winners are visually highlighted
- Results added to the top navigation and home screen

No database migration is required for Version 10.


## Version 10.1 changes
- Signup success text now tells users their account is waiting for administrator approval; no email-confirmation instruction is shown.
- Teams page top-right summary now shows only the number of teams, not the total player count.
- To complete the no-confirmation signup flow, disable Confirm email in Supabase Authentication > Providers > Email. Admin approval remains the access gate.

## Version 11 — Live TV Monthly Leaderboard
- New `/tv` full-screen 1920x1080 monthly standings display.
- Shows Rank, Team, Handicap, Week 1–3 adjusted scores, and Total Adjusted.
- Rank movement indicator appears beside Total only.
- Supabase Realtime subscriptions refresh the board when weekly scores or monthly handicaps change.
- Recently changed team row briefly highlights.
- TV route automatically hides normal app navigation.

## Version 11.1 – Approved TV Design Match
- Rebuilt `/tv` to closely match the final approved 1920×1080 mockup.
- Uses the Tom Krise 19th Hole Golf Simulator logo at upper left with transparent/high-contrast treatment.
- Exact seven-column approved layout: Rank, Team, Handicap, Week 1/2/3 Adjusted, Total Adjusted.
- White weekly scores; green handicap and total; enlarged total; movement only beside total.
- Removed footer/course/live-leaderboard elements that were not part of the approved design.
- Retains Supabase Realtime score/handicap refresh and changed-team flash.
