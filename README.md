# Golf League App Version 12.8

Version 12.8 fixes player announcement refresh behavior on phones and installed home-screen apps.

Changes:
- Messages refresh on page load, app focus, and when the installed app returns to the foreground.
- Unread badges refresh on Home and the persistent bottom navigation.
- Adds Supabase realtime listeners for announcements and read-state changes when realtime is available.
- Adds a 15-second fallback refresh so messages still appear even if realtime replication is not enabled.
- Reading a message updates unread badges immediately.

Push notifications / operating-system alerts are not included in this version; those remain a separate next step.

## Version 12.9 — phone push notifications
Players can enable/disable notifications from Settings. On iPhone, the site must first be added to the Home Screen and opened as the installed web app. Admin announcements can optionally send a phone alert; tapping the alert opens Messages.

Vercel requires the server-only `VAPID_PRIVATE_KEY` environment variable before push delivery will work. The matching public key is already compiled into the app. `VAPID_SUBJECT` is optional and defaults to the production site URL.


## Version 12.10
Push notifications now deep-link to the exact announcement. Tapping a notification opens that message directly and marks it read; players can return to All Messages.

## Version 12.11 — Simulator reservation reminders
- Adds automatic push reminders about 24 hours and 1 hour before active personal simulator reservations.
- Reminder notification opens My Sim Reservations when tapped.
- Uses the same phone notification permission/subscription already enabled in Settings.
- Requires server-only Vercel variables `SUPABASE_SECRET_KEY` and `CRON_SECRET`.
- The reminder endpoint is `/api/reminders`; schedule it from Supabase Cron every 10 minutes with `Authorization: Bearer <CRON_SECRET>`.


### Reminder cancellation flow
Reservation push notifications now deep-link to the specific reservation on My Sim Reservations. The reservation is highlighted, the Cancel Reservation button is immediately available, and cancellation still requires confirmation before the time is released.
