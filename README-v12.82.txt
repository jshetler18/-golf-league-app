Golf League App v12.82 — Strict Scorecard Validation

Added:
- Scorecard validation progress/checklist before Verify Scores unlocks.
- Blocks submission unless course, required holes, both configured bonus holes, at least two roster player names, stimp, week-specific pins, gimmies, wind, fairways, greens, mulligans, and elevation all match the admin setup.
- Four required weekly pin settings on Monthly League Setup (Week 1–4), each required and unique.
- Current-week pins shown on the player Round Setup page.
- Verify Scores shows only holes 1–10 plus the two configured bonus holes.
- Score selection displays golf results (Albatross+, Eagle, Birdie, Par, Bogey, Double Bogey+) instead of raw score numbers.
- Removed the icon beside Submit Score in both profile dropdowns.

Database:
- Added league_months.pins_week_1 through pins_week_4.
- Migration is included in supabase/migrations/20260903_add_weekly_pin_settings.sql.
- Migration was also applied to the connected live Supabase project on 2026-09-03.
