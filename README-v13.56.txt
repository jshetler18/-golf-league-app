v13.56 - Monthly player tee-box overrides

Admin > Monthly League Setup > Player Tee Box Assignments:
- Each player still defaults to the Official Tee Box set on Players & Teams.
- Added a Monthly Tee Box dropdown for each player.
- The dropdown only shows tee levels that have been configured for the selected course/month.
- An admin can override a player's default tee for that month without changing the player's global Official Tee Box.
- Changing the dropdown immediately updates the displayed Course Tee and Yardage.
- Saving Monthly Setup writes the selected course tee color/name and yardage into that month's tee_assignments.
- Existing saved monthly assignments are loaded back into the dropdown when possible.
- No database schema changes.
