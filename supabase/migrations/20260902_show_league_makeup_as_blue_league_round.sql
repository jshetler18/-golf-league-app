-- v12.46: Treat recurring League Make-Up Time as league reservations in the player calendar.
-- Allows a league booking to be linked to either a team or a make-up schedule.
ALTER TABLE public.bookings DROP CONSTRAINT league_requires_team;
ALTER TABLE public.bookings ADD CONSTRAINT league_requires_team
CHECK (kind <> 'league'::booking_kind OR team_id IS NOT NULL OR league_makeup_slot_id IS NOT NULL);

-- Production function set_league_makeup_slot was updated to create kind='league'
-- bookings titled exactly 'Makeup - League Round'. Existing future make-up bookings
-- were converted to the same kind/title so they render with the normal blue league style.
