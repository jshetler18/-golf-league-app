# v13.88 Update Only

Fixes historical scorecards being hidden when an archive_video_id does not exactly match the currently rendered YouTube recording id.

Recorded Rounds now:
1. Uses the direct archive video link when it matches.
2. Falls back to month/year/week/team and Week 4 matchup matching if the direct id does not match.

This specifically makes historical Team Mock Week 4 / Team Hutzel matchup scorecards resilient to archive metadata/id mismatches.
