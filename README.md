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
