# Golf App V2 — isolated rollout

**Safety:** Do not modify the original golf project, volunteer project, main branch, or live domain. Do not restore the raw Auth archive into V2: two email identities already exist with different UUIDs.

## Projects
- Original Supabase: `csaqnjkytxaondagusef` — read only.
- V2 Supabase: `aopuvcxjwlqwitxigeyr`.
- Volunteer Supabase: `ghljzqzkngwcauxusarv` — out of scope.
- Isolated Git branch: `golf-v2-isolated-build`; Vercel V2 test deployment must be verified to build this branch, not `main`.
- Live domain `www.lvvgolfsim.com` remains on original until user approves cutover.

## Completed and verified (2026-10-24)
- 37 application tables created in V2, with RLS enabled; historical user-independent records copied.
- Private, revoked `migration_private` staging: 35 original profiles, 1,077 bookings, 129 linked records, two verified account ID mappings. Booking audit tracks all 1,077.
- 1,047 active and 30 cancelled bookings; 883 future starts at inspection time. Only 58 bookings have fully mapped account references. None imported into `public.bookings`.
- Original Auth: 35 users and 35 identities. V2 Auth: 2 users and 2 identities; both have matching V2 profiles.
- `jshetler@lvv1.com` is V2 admin, approved, booking enabled, account approver and scorecard official. Preserve this access.
- `joeshetler@ymail.com` is a pending V2 user; compare to original before reconciling.
- Booking, chat, reactions, notification preferences and push subscription RLS policies installed on V2. They still require authenticated user-level functional tests.
- A local Windows archive `%USERPROFILE%\GolfV2Migration\golf-auth.backup` was created by the user with `pg_dump` from original Auth tables and checked using `pg_restore --list`. Archive includes `auth.users` and `auth.identities`. It has NOT been imported. **Never upload, commit, email, or paste archive content or credentials.**

## Still required
1. Safely reconcile 33 missing Auth users and two existing email collisions, preserving encrypted password hashes and the V2 admin's identity and permissions. Prepare a collision-aware, transactional process; do not run `pg_restore` directly against live V2 Auth tables. Validate the complete Auth schema/identities/triggers/constraints and Supabase-supported migration procedure first. The local archive cannot be accessed by connected tools.
2. Reconcile all 35 profiles and linked data with verified UUID mapping; activate bookings only after referential integrity, time overlaps and status checks.
3. Original database has **18 public function overloads**, whereas V2 has **4**. Migrate and test the missing functions, triggers, indexes, constraints and remaining RLS policies. Booking RPCs, enforcement and updated_at triggers are especially important.
4. Migrate storage buckets/objects and verify URL access; configure notifications, cron, VAPID and push safely without duplicate sends.
5. Verify isolated Vercel test build uses V2 branch and V2 environment variables; test sign-in and JWT/PostgREST, admin, scorecards, reservations, chat, leaderboards, Fire TV and mobile PWA.
6. Explicit user approval before live domain switch; preserve rollback and backups.

## Password migration safety
- Passwords can be preserved via Auth encrypted hashes, but login compatibility is **not yet tested**.
- Source users have UUIDs different from the two V2 test users. Never overwrite V2 Auth rows or force original UUIDs into the two existing V2 identities without a controlled reconciliation plan.
- The local archive is sensitive; restrict access, do not share it, and securely remove it after successful migration and validation.
- If database credentials are needed, prompt only on the user's laptop, never in chat.
