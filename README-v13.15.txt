v13.15 - Scorecard reviewer push alerts

- When a player successfully submits or resubmits a scorecard, the app now immediately sends a push notification to every approved Admin and Scorecard Official who has push notifications registered.
- Notification title: Scorecard Ready for Approval
- Notification includes team, month, week, and submitting player's name.
- Tapping the notification opens the Scorecard Official approval page.
- Push delivery is best-effort and never blocks or reverses a successful scorecard submission.
- Existing approval, denial, and Round Complete notifications are unchanged.
- No database schema changes.
