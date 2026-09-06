v13.32 - Complete league rules + configurable standings score cap

RULES
- Replaced the live League Rules content with a comprehensive 14-section rules page covering:
  season/monthly format, weekly round format, Stableford scoring, bonus par-3 holes,
  monthly handicap, 30-point standings maximum, Weeks 1-3 seeding, Week 4 head-to-head,
  Cup points, monthly champion, scorecard approval, make-up/early rounds,
  monthly simulator settings, and monthly tee assignments.
- Rules remain editable in Admin > Rules.

STANDINGS SCORE CAP
- Added a season-level Standings Score Cap setting under Admin > League Setup & Scoring.
- Current active season defaults to 30.0.
- Actual/raw scores remain stored uncapped.
- All-time team raw-score statistics remain uncapped.
- Monthly standings use min(actual adjusted score, score cap) for each weekly round.
- Weeks 1-3 seeding uses capped standings scores.
- Week 4 head-to-head comparisons use capped scores.
- Player Monthly Standings, My Team standings display, admin scoring/seeding,
  Week 4 admin view, and TV leaderboard use the cap.
- Example: actual 30.5, 31.1, or 32.0 all count as 30.0 for standings/match play,
  while the actual score remains available for raw/all-time statistics.

DATABASE
- Live Supabase schema updated with seasons.standings_score_cap numeric default 30.
- Migration included: supabase/migrations/20260906_add_season_standings_score_cap.sql

NOTE
- Existing actual weekly_scores were intentionally NOT overwritten or reduced to 30.
  The cap is applied when calculating/displaying league standings and matchup results.
