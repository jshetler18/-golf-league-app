v13.68 - Remove month assignment fix

Admin > Assign Courses to Months:
- If a month currently has a course assigned, changing Course back to "Select course" and saving now removes that month's league_months assignment.
- Related monthly tee assignments, course tee rows, and monthly handicaps are removed automatically by the existing database foreign-key cascade behavior.
- The month then disappears from player-facing Rules & Settings > Monthly Settings because only configured league_months are shown.
- The saved reusable Course Setup profile is NOT deleted.
- Button changes to "Remove Month Assignment" when an existing month is being cleared.
