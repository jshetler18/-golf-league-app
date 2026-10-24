# Golf App V2 — isolated rollout

This branch is for the replacement golf backend. **Never merge or attach the live domain before authentication, authorization, migration and notification tests pass.**

## Backend
- Supabase V2 project: `aopuvcxjwlqwitxigeyr` (us-east-2).
- Original golf project: `csaqnjkytxaondagusef` (read-only during preparation).
- Volunteer project: `ghljzqzkngwcauxusarv` (out of scope).
- The initial V2 `public.profiles` table exists with user/admin roles, approval status, and owner-only read policy.
- Existing golf accounts, reservations, and scores **have not been migrated**.

## Authentication acceptance test
1. Provision a disposable test Auth user through supported Admin Auth API, not raw SQL.
2. Create the matching `public.profiles` row with approved status, preserving `auth.users.id` relationship.
3. Sign in with password using the **V2** publishable key.
4. Request `public.profiles` through PostgREST with the returned bearer token.
5. Confirm HTTP 200 and only the test user's own row (not `PGRST303` / JWT issued at future).
6. Confirm invalid tokens and attempts to read another profile fail closed.
7. Delete disposable test account and profile after validation.

## Migration acceptance
Inventory and migrate all tables, enums, constraints, indexes, triggers, functions, RLS policies, Auth users, storage objects, scheduled jobs and secrets. Preserve original UUIDs where needed for relationships. Validate row counts, sample referential integrity and role behavior. Determine supported password-hash migration before claiming existing passwords will work.

## Notification acceptance
Migrate announcements, reads, preferences, subscriptions and booking-reminder delivery history as appropriate. Configure server-side VAPID keys, push endpoints, cron jobs, service worker and URL origin. Test booking reminders, scorecard approval/denial and admin broadcasts on real devices; avoid duplicate sends during cutover.

## Cutover
Use an isolated Vercel project or preview environment with V2-only variables. Do not change `www.lvvgolfsim.com` until the user approves after testing. Preserve PWA scope and app identity. Keep old Supabase project for short rollback period, export final backup, then delete only after user authorization.
