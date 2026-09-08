v13.95 - Submit Score loading reliability
- Prevents Submit Score from remaining indefinitely on "Loading your round..." when auth/profile/player/team/season/month initialization fails.
- Uses the cached Supabase session first, then verifies/fetches the user when needed.
- Adds explicit error handling for profile, player/team assignment, active season, months, and teams.
- Preserves existing scorecard submission, cross-team submission, pending, denied, resubmission, and official review behavior.
- League Meeting RSVP remains available at Admin > League Meeting RSVP.
