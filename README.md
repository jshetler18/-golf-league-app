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
