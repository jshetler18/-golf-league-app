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
