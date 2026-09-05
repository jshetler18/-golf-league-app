v13.14 - Push notification reliability and diagnostics

- Settings now verifies and refreshes the signed-in device's server push registration whenever Settings opens.
- Notifications no longer show as enabled solely because a local browser subscription exists if server registration fails.
- Added Send Test Notification so a player can verify push delivery without approving a scorecard.
- Added server-side push failure logging for scorecard approval/denial notifications.
- No database schema changes.
