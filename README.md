# Golf League App v12.67

Recorded Rounds raw-score thumbnail update.

## Changes
- Recorded archive cards now show the YouTube thumbnail before playback instead of immediately loading every iframe.
- A red `RAW SCORE` badge is overlaid on the thumbnail when the recording can be confidently matched to an official raw score.
- Matching uses team + month/year + round number against `team_raw_score_history`.
- If a score cannot be matched confidently, the badge is intentionally omitted rather than showing a potentially wrong score.
- Clicking the thumbnail starts that recording directly in the archive card.
- YouTube video duration is shown on the thumbnail when available.
- Added recorded-round result count and season grouping while preserving the existing Team / Season / Month / Round filters.
- Existing live broadcast area, Live badge behavior, and archive fallback behavior remain unchanged.

## v12.68
- Recorded Rounds now shows the official Raw Score on the right side of each recording description, so it remains visible below the thumbnail.
- Raw-score matching was hardened by normalizing team names (with or without the word "Team") and recognizing additional Round/Week number formats in older YouTube metadata.
- The thumbnail score badge remains available when a match is found.


## v12.69
Recorded Rounds cards now display archive metadata on separate lines: team, month/year, round number, then season in smaller text.


## v12.71
- Historical Team Smith YouTube recordings are grouped under Team Shingler for archive filtering.
- Team Smith recordings use Team Shingler raw-score history when matching scores.
- Removed the raw-score overlay from video thumbnails.
- Changed the raw-score display beside each recording description from a rounded square to a circle.


## v12.71
- Live/recorded-round metadata parsing now recognizes known team names even when the month is typed immediately after the team name in OBS/YouTube, e.g. `Team SmolnikDecember 2025 Week 4`.
- `Week 1`–`Week 4` and `Wk 1`–`Wk 4` are treated as the corresponding Round 1–Round 4 in the shared live/archive parser.
- The parsed result for the example above is Team Smolnik / December 2025 / Round 4, so archive filtering, raw-score matching, Home live banner, and live push text can use the correct metadata.


## v12.72
- Restored the Recorded Rounds raw-score badge to the prior rounded-square style.
- Added a Raw Score archive control with All Scores, High to Low, and Low to High.
- Recordings without a matched score remain visible and sort after scored recordings when score sorting is active.


## v12.73
Recorded Rounds now detects two-team recordings and displays both official raw scores beneath the video. For Round/Week 4, if only one team is named in YouTube metadata, the archive can use the saved Week 4 matchup to identify the opponent. Team Smith remains normalized to Team Shingler. Team filtering matches either team in a matchup.


## v12.74 Recorded Rounds Championship display
- Detects archived YouTube videos containing the word `Championship` in the title or description.
- Treats a Championship Round as Round 4 internally when no explicit round/week number is present, allowing matchup and raw-score lookup to work.
- Championship archive cards show `Team A vs Team B`, then month/year, then `Championship Round`, then the existing smaller season line.
- When both matchup raw scores are available, both labeled team scores continue to display under the video.
- Team Smith remains canonicalized to Team Shingler for archive search and raw-score matching.

## v12.75 — Team Smith Championship Alias Fix
- Normalizes historical `Team Smith` / `TeamSmith` YouTube metadata to `Team Shingler` before any archive parsing occurs.
- This makes Team Smith work consistently for championship opponent detection, archive team matching, filters, and raw-score lookup.
- Championship recordings such as `Team Shetler vs Team Smith` now display as `Team Shetler vs Team Shingler` when both teams are detected.
- Both official raw scores are shown when the matching team/month/round scores exist in `team_raw_score_history`.


## v12.76 – More reliable matchup video detection
- Makes archived two-team detection much more tolerant of older OBS/YouTube descriptions, including `Team Hutzel vs Team Mock`, `Hutzel vs Mock`, punctuation, and missing spaces.
- Stores detected matchup teams separately from score matching, so a card can show `Team Hutzel vs Team Mock` even if one score lookup ever fails.
- Uses both detected teams in Team filtering.
- Keeps Team Smith normalized to Team Shingler before matchup detection.
- Verified April 2026 Round 4 raw scores exist for Team Hutzel (22) and Team Mock (22).

## v12.77 — reliable 1-minute YouTube LIVE detection
- Replaced the quota-heavy YouTube Search API live lookup (100 quota units/call).
- Live detection first uses the public `@Toms19thHole/live` redirect (zero Data API quota).
- Falls back to the channel uploads playlist + video details (low quota cost) instead of Search API.
- Added server-only `youtube_live_state` singleton so player devices read one shared status instead of each device querying YouTube.
- The Home LIVE banner and Recorded Rounds page continue polling the app every minute, but those polls no longer consume YouTube quota.
- Designed for the Supabase reminder/live cron to run every minute after v12.77 is deployed.

## v12.78 — Team Scorecard Submission
- Added **Submit Score** as the first item in the player profile dropdown (above My Profile).
- Players upload/take a final GSPro scorecard photo; free browser-based Tesseract OCR attempts to read the grid.
- Players verify/edit hole pars and scores before submitting. Stableford holes 1–10, designated bonus par-3 birdies, monthly handicap, and official total calculate automatically.
- One submission per team/month/week prevents duplicate scorecards; pending submissions show Awaiting Admin Approval.
- New Admin **Score Submissions** page shows calculated totals and enhanced scorecard, with Approve & Post / Reject controls.
- Admin approval posts the score into weekly_scores and sends a league-wide **Round Complete** push notification deep-linked to the enhanced scorecard.
- Added enhanced digital round scorecard with roster names, hole pars/scores, Stableford points, raw score, bonus, handicap, and official total. Original GSPro photo remains available to the submitter/admin for verification.
- Added private `round-scorecards` Storage bucket and RLS-protected `round_score_submissions` table.


## v12.80
- Submit Score defaults to the current league month and week.
- Added Change Round for makeup rounds, early rounds, and multiple rounds played in one calendar week.
- Players can select any league month in the active season and Week 1-4 before uploading.
- Completed and pending rounds are protected from duplicate submissions.
- Keeps separate Take Scorecard Photo and Choose from Photos actions and the updated profile-menu icon.

## v12.93 scorecard symbol reading
- Score verification now uses the scorecard's visual scoring marks as a second signal: single red circle = birdie, double red circle = eagle, no scoring mark = par, single black box = bogey, double black box = double bogey or worse.
- Hole pars are aligned by OCR word position to reduce row/column shifting.
- Pins were tightened back up so the configured weekly pin value has to be recognized near the Pins label; the ultra-loose global fallback is no longer used for pins.
- Stimp detection now distinguishes 10/11 only near the Stimp label and the UI reports an approved league Stimp rather than claiming an exact value when OCR may be ambiguous.
