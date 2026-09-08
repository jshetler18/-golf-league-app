v13.84 — Week 4 multi-scorecard display

- Recorded Rounds keeps the simple "View Scorecard" button when a matching recorded round has one scorecard.
- When the same recorded matchup has two matching team scorecards, each button automatically includes the team name, e.g. "Team Mock – View Scorecard" and "Team Hutzel – View Scorecard".
- Upload a Past Scorecard already supports separate uploads for different teams in the same league month and week. The existing duplicate lookup is scoped to league_month_id + team_id + week_number, so a second team does not overwrite the first team's scorecard.
- No database migration required.
