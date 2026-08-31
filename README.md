# Tom Krise 19th Hole Golf Simulator

Next.js + Supabase web app for simulator bookings and the indoor golf league.

## Current app features
- Email/password sign-up and sign-in
- New-account admin approval workflow
- Booking calendar: 7 AM–9 PM Eastern, 1-hour increments
- Personal bookings up to 3 hours/day and 30 days ahead (enforced by Supabase)
- My Bookings with cancellation
- League reservations that display the team name
- Admin blocked-time reservations
- League standings/Cup/history/setup starter pages

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These are configured in Vercel for the production project.

## Important next build items
- Configure the first approved admin account
- Push notification permission/subscription UI
- Scheduled 24-hour and 1-hour booking reminders
- Full admin management for scores, handicaps, tee assignments, announcements, and history
- PWA manifest/icons and final Tom Krise 19th Hole branding assets
