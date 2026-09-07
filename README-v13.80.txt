v13.80 — Published monthly team handicaps

- Player Team Handicaps tab is now a frozen published snapshot rather than a live recalculation.
- Admin can continue adjusting upcoming monthly handicaps without changing the player page.
- Admin uses Confirm Handicaps & Notify Players to publish the upcoming month.
- Publishing snapshots the raw scoring average, counted/dropped rounds, handicap standard, and confirmed handicap.
- Republish is supported after an admin adjustment; the player page changes only on republish.
- Publishing sends approved players a push notification linking directly to /teams?tab=handicaps.
- Initial publish title: New Team Handicaps Set. Republish title: Team Handicaps Updated.
- All active teams must have a numeric handicap before publication.
- Added public.handicap_publications with read-only player access and server-side admin writes.

Live Supabase migration 20260907_add_handicap_publications was applied.
Build was not run because node_modules/.bin/next is not present in this workspace.
