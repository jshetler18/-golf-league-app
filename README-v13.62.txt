v13.62 - Course location display

Admin > Monthly League Setup
- Added Course Location field directly beside Course Name.
- Example entry: Somerset, PA or Myrtle Beach, SC.
- Course location saves with the selected league month.

Rules & Settings > Monthly Settings
- When a month is selected, the course location appears directly under the course name.
- Location uses smaller text similar in scale to the month/year treatment.
- If no location has been entered, nothing extra is shown.

Also preserves v13.61:
- Player Tee Box Assignments show Forward / Senior / Middle / Back / Tips instead of course tee colors.

Database:
- Added league_months.course_location text column.
- Live Supabase schema was updated and verified.
