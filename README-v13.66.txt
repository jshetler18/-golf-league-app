v13.66 - Reusable Course Setup + Month Assignment

Admin is now split into two steps:

1. Course Setup
- Create or edit a saved course without choosing a month.
- Course name and city/state
- Bonus par-3 holes and bonus value
- Week 1-4 pin settings
- Simulator settings
- Course tee colors and yardages
- Saved courses can be reused in future months/seasons.

2. Assign Courses to Months
- Select November-April.
- Choose one of the saved configured courses.
- Saving applies that course's complete setup to the selected league month.
- Team handicaps remain month-specific.
- Player tee overrides remain month-specific and default from each player's Official Tee Box.

Existing configured 2026-27 courses were copied into the reusable Course Setup library in Supabase and linked back to their existing months.

The player-facing Monthly Settings page continues to read league_months, so its behavior remains compatible.

Supabase schema was applied live and verified.
