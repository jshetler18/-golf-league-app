v13.98 – RSVP live roster refresh and captain labels

- Public RSVP page refreshes the roster whenever the page/tab becomes active again.
- Also refreshes every 30 seconds while the RSVP page is visible so newly added active players appear without a manual reload.
- Adds horizontal padding so player names are no longer flush against the edge of the team card.
- Team captains are labeled (C) on the public RSVP page using each team's current captain_player_id.
- Existing RSVP responses are preserved.
- No database migration required.
