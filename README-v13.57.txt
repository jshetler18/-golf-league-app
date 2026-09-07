v13.57 - Team captains

Players & Teams admin:
- Added a Team Captain dropdown inside each active team card.
- Captain choices are limited to active players on that team.
- A captain can be cleared by choosing Not Set.
- If the current captain is removed from the active roster, the captain setting is cleared first.
- The selected captain is listed first in that team's roster and displays a smaller italic (C).

Captain ordering/display:
- Players & Teams admin roster
- Teams player-facing page
- My Team roster
- Rules & Settings > Monthly Settings > Player Tee Box Assignments
- Admin > Monthly League Setup > Player Tee Box Assignments

On those team-grouped roster/assignment lists:
- Captain is always first under the team name.
- Captain displays as, for example, Joe Shetler (C), with (C) smaller and italicized.
- Remaining players are alphabetical.

Database:
- Added teams.captain_player_id nullable UUID foreign key to players(id), ON DELETE SET NULL.
