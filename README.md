# Golf League App v12.65 — Recorded Rounds Archive

Changes from v12.64:
- Renames the Home menu item from Live to Recorded Rounds.
- Reworks /live into the Recorded Rounds page.
- Keeps any active livestream at the very top with the existing LIVE treatment.
- Shows “No live broadcasts at this time” when no stream is active.
- Adds a YouTube archive endpoint that scans the @Toms19thHole channel uploads and identifies league rounds using the same team + month/year + round metadata rules as the live banner/push notification.
- Includes prior seasons automatically when their public recordings are still on YouTube and have recognizable metadata.
- Adds archive filters for Team, Season, Month, and Round; each supports an All option.
- Groups season values automatically from league month/year metadata (Nov-Dec -> current/next year, Jan-Apr -> previous/current year).
- Excludes current live/upcoming videos from the recorded archive.
- Archive responses are cached for 5 minutes to reduce YouTube API usage.

Recommended YouTube title/description metadata for each league round:
Team Billow
November 2026 Round 1

A recording must contain both a recognized league team name and recognizable month/year/round information in its title or description to appear in the archive.
