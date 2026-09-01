# Golf League App Version 12.8

Version 12.8 fixes player announcement refresh behavior on phones and installed home-screen apps.

Changes:
- Messages refresh on page load, app focus, and when the installed app returns to the foreground.
- Unread badges refresh on Home and the persistent bottom navigation.
- Adds Supabase realtime listeners for announcements and read-state changes when realtime is available.
- Adds a 15-second fallback refresh so messages still appear even if realtime replication is not enabled.
- Reading a message updates unread badges immediately.

Push notifications / operating-system alerts are not included in this version; those remain a separate next step.
