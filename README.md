# v13.86 – Historical Week 4 scorecard matching fix

Recorded Rounds now uses forgiving team-name matching for historical recordings. Older archive labels such as “Team Mocks” or “Team Hutzel's” match the current database names “Team Mock” and “Team Hutzel”. Existing uploaded scorecards do not need to be uploaded again.

No database migration is required.

## v13.87 — Direct Recorded Round scorecard linking
- Past scorecard uploads now require selecting the exact Recorded Round.
- The selected YouTube video ID is stored on the scorecard submission (`archive_video_id`).
- Recorded Rounds matches directly by video ID first, eliminating historical Week 4 title/team/date parsing failures.
- If old video team metadata is weak, the uploader still offers recordings from the selected month/week so the admin can choose the exact one.
- Existing legacy matching remains as a fallback for older uploads.

## v13.88
Recorded Rounds scorecard matching no longer fails closed when an historical scorecard has an archive_video_id that does not exactly match the rendered recording id. Exact direct links are still preferred, then historical month/week/team matchup matching is used as a fallback.


## v13.94
Open League Meeting RSVP pages now synchronize against the active season roster. Players added after a meeting is created automatically appear under their team when the same RSVP link is opened. Closed meetings remain frozen for historical accuracy.

- v13.113: All desktop pages now use the same white Golf Sim logo/profile header as the desktop Home page; the old green desktop header is removed. Mobile/tablet behavior is unchanged.
