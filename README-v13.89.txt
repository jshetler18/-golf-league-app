v13.89 - Recorded Rounds scorecard loading fix

Fixes a client session timing race that could prevent approved scorecards from loading at all on Recorded Rounds. The approved-scorecards server route now returns only approved scorecards without waiting for the browser Supabase session, and remains server-side with signed image URLs.

This affects both linked Week 4 matchup recordings (Team Mock) and standalone Week 4 recordings (Team Rovder).
