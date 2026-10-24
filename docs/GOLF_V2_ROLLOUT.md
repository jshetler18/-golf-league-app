# Golf App V2 — isolated rollout and cutover checklist

Updated 2026-10-24. **NOT READY FOR CUTOVER.**

## Isolation and safety
- Original golf Supabase `csaqnjkytxaondagusef`: **read only**. Do not change its database, production Vercel project, production domain `www.lvvgolfsim.com`, or GitHub `main`.
- Volunteer Supabase `ghljzqzkngwcauxusarv`: **never modify**.
- V2 Supabase `aopuvcxjwlqwitxigeyr`; isolated GitHub branch `golf-v2-isolated-build`.
- V2 Vercel project `golf-league-v2-test`; preview deployment `dpl_6PrM55RhpUQgcqo5HRuxoatzGQPZ` previously reported READY, but protected by Vercel SSO. Recheck after code changes.
- Do not point the two Fire TVs or the live domain to V2 until tests and explicit cutover approval.

## Verified progress
- 37 public application tables and historical league data transferred.
- 35 original Auth users and password hashes restored; 33 original UUIDs preserved and two mapped to preexisting V2 UUIDs. All 35 email-confirmed. Password-preserving login was tested for the player and admin accounts; complete user-by-user validation is still outstanding.
- 35 profiles reconciled: 33 approved booking-enabled league users, 1 approved admin, 1 pending booking-disabled user. `joeshetler@ymail.com` is approved **player**, not admin; `jshetler@lvv1.com` retains admin access.
- Private staging holds 35 original profiles, 1,077 source bookings, 129 linked records and two account-ID mappings. **111 linked records have now been imported and verified**: 72 announcement reads, 33 booking reminder deliveries, 1 chat preference, 2 chat read states and 3 approved round submissions. The remaining 18 push subscriptions are deliberately not copied until V2 notification keys and client re-subscription behavior are validated.
- 195 historical bookings imported with original booking IDs; 882 future bookings remain staged and deliberately **not active**, while production remains the booking source of truth.
- 74 public RLS policies, 74 public indexes, 37 check constraints, 72 foreign keys, and 37 primary keys present in V2, matching original **counts**. Some original UNIQUE constraints are represented by unique indexes in V2 (original 21 UNIQUE constraints vs V2 2); test equivalence, do not assume equal behavior from counts alone.
- Original `avatars` and `round-scorecards` storage buckets and eight matching storage policies created in V2. **File contents not transferred**.
- 20 public functions and 6 triggers previously restored; check current definitions and invocation rights before release.
- Supabase security advisor anonymous SECURITY DEFINER execution warnings cleared in V2. Internal trigger function EXECUTE revoked from authenticated role for `enforce_booking_rules` and `sync_weekly_score_raw_history`. Remaining authenticated-function warnings require individual review.

## Remaining blockers and tasks
1. **Transfer binary storage objects:** original has 7 avatar objects and 23 private round-scorecard objects; V2 buckets remain empty. Do not mistake storage metadata for actual bytes. Private originals require an authenticated, approved migration route.
2. **Push notification cutover:** 111/129 staged linked records are imported and verified. The 18 original push subscriptions are intentionally not migrated because subscriptions and keys may not work across V2 origins; validate VAPID, re-subscription and duplicate-notification prevention before enabling sends. The 3 approved scorecard records are restored, but their referenced image binaries are still missing.
3. **Final booking synchronization:** reconcile all 1,077 original bookings with V2, map original UUIDs, preserve cancellation states and resolve conflicts. Import the 882 future bookings only in a controlled cutover window after stopping writes on original. Note most blocked and league bookings intentionally have NULL personal owner IDs; investigate personal owner mappings separately.
4. **Validate security:** compare RLS predicates, function grants, constraints and RPC behavior (counts alone insufficient); review remaining security advisor warnings. Supabase leaked-password protection is a separate Auth dashboard setting.
5. **Functional acceptance tests:** original-password sign-in for player, admin and booking-only accounts; booking/cancel/time-window/overlap; admin blocking and approvals; scorecard upload/official approval/rejection and Recorded Rounds; messaging, push, reminders; monthly/Cup leaderboards, Fire TV views and mobile PWA.
6. **Deployment and cutover:** verify V2 environment variables point only to V2; recheck preview build and app functionality. Obtain explicit user approval for live domain and TV switch, with rollback plan.
7. **Booking window discrepancy:** both original and V2 were observed with 7-day booking windows, despite earlier user preference for 30 days. Do not change this setting without confirmation.

## Sensitive backups and secrets
- Local Windows backup files: `%USERPROFILE%\\GolfV2Migration\\golf-auth.backup` and `v2-auth-safety.backup`. Keep local; never upload, commit, paste or email password hashes, secrets or backup content.
- Rotate any previously exposed V2 deployment hook URL after rollout.
- Never present the migration as complete while file transfer, future booking cutover or acceptance tests are outstanding.

### Booking identity audit (2026-10-24)

The 80 staged personal bookings include **22 records belonging to 7 distinct original owner IDs that are not present in the 35 restored V2 auth accounts**. Nineteen of the 22 are marked active, and **one of the 22 is a future booking** (based on `start_at`). Do not activate or silently discard that reservation. Resolve the owner's identity, establish a safe account mapping or obtain an explicit disposition, and recheck the original live booking data at cutover. Blocked and league bookings normally have null `user_id` and are not evidence of missing owners. The original production app remains authoritative until cutover.
