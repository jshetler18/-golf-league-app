# Golf League App v12.44

Simulator scheduling refinements:
- Team recurring schedule time choices standardized to 6–9 AM, 9 AM–12 PM, 12–3 PM, 3–6 PM, and 6–9 PM.
- League Make-Up Time moved into the same Team & League Schedules page and is selectable from the Team / Schedule dropdown.
- League Make-Up Time always displays with that exact name on the reservation calendar.
- Multiple recurring League Make-Up Time blocks can still be created, edited, and removed from the combined page.
- Simulator dashboard simplified to Team & League Schedules plus Bookings & Block Time.
- Legacy make-up page redirects to the combined scheduling page.


## v12.48
Recurring Team & League Schedules now use separate Starting Time and Hours Reserved controls. Admin can reserve 1-24 hours; the former fixed 3-hour restriction is removed.


## v12.48
- League Make-Up Time now appears on the player reservation calendar using the same blue league-reservation styling as team league rounds.
- Player-facing label is `Makeup - League Round`.
- Existing future recurring make-up bookings are converted automatically.


## v12.48
- Reservation time slots now toggle off when a selected time is tapped/clicked again.
- Keeps reservations consecutive and limited to the existing 3-hour player maximum.


## v12.48
- Added recurring simulator blocks to Admin → Simulator → Bookings & Block Time.
- Admin can choose reason, day each week, starting time, hours reserved, schedule start, and schedule end.
- Recurring blocks can be edited or removed; changing a schedule rebuilds future occurrences while preserving past ones.
- Existing bookings are protected by conflict detection.
- One-time simulator blocks remain available on the same page and now support 6 AM starts and 1–24 hour lengths.


## v12.49
- Reservation time selection can now expand backward or forward from the first selected hour.
- Existing 3-hour maximum, consecutive-hour requirement, and tap-again-to-deselect behavior remain unchanged.


## v12.50
- Restored the tee-box key to the player Teams page above the Championship Key.
- Tee legend uses colored squares and approximate yardages: Forward ≈3,500; Senior ≈5,000; Middle ≈5,500; Back ≈6,000; Tip ≈6,500+ yards.


## v12.53
- Reworked raw score statistic cards so All-Time and Current Season each contain their centered average above low/high records.
- History heading changed to Cup Champions.
- Teams renamed Teams & Rankings on Home and page heading.
- Added Teams/Rankings toggle with sortable team ranking metrics and raw/handicap modes.
- Handicap rankings use raw score + monthly handicap. Historical handicap data prior to records stored in the app is not available, so adjusted all-time begins with available app scoring data.


## v12.54
- Restored Teams page as a single Teams view.
- Moved raw-score Rankings to History below Monthly Champions.
- Rankings use raw scores only with six score metrics.
- All-Time and Current Season average score panels now match the low/high background.

## v12.55
- History Rankings now display whole-number values with no decimals.
- Rankings table was tightened for phone screens so the selected statistic title wraps above the value column instead of forcing horizontal scrolling.
- Restored Cup Championships and Monthly Championships to the Rankings statistic dropdown.


## v12.56
- History Rankings statistic header enlarged to match Rank/Team header sizing.
- Rankings now use competition ranking for ties (1, 1, 3, etc.) across every ranking statistic.
- Cup Standings Match Play redesigned with head-to-head matchup cards, prominent Cup point scores, VS badge, and winner highlighting.

## v12.60 YouTube Live
- Adds a Live page for @Toms19thHole with an embedded active livestream.
- Shows a pulsing red LIVE indicator on the Live page and Home menu while streaming.
- Adds a server endpoint for automatic live detection through YouTube Data API v3.
- Adds a cron-ready push endpoint that sends one push notification per livestream and deep-links to /live.
- Requires server-only Vercel environment variable YOUTUBE_API_KEY.
- After deployment and API-key setup, schedule POST /api/youtube/live/check with Authorization: Bearer CRON_SECRET every 5 minutes.

## v12.61 — Home Screen Message Badge
- Adds installed-app icon badging for unread league Messages where the device/browser supports the Badging API.
- Badge count is synchronized to the exact unread announcement count whenever the app is active.
- Announcement push notifications increment the stored app-icon badge while the app is closed.
- Reading messages automatically reduces/clears the badge through the existing unread refresh event.
- YouTube Live push notifications do not change the message-count badge; the pulsing LIVE indicator remains inside the app.

## v12.62 YouTube live automatic checker
- YouTube live detection now runs from the existing 5-minute simulator reminder cron, so no second cron job is required.
- The existing reservation reminder process remains intact.
- Live notification checking is isolated so a YouTube API problem will not stop simulator reservation reminders.
- The dedicated `/api/youtube/live/check` route remains available for authenticated cron/manual server checks.

## v12.63
- Added a live-round alert card above Reserve Sim on the Home page that only appears while YouTube is live.
- The alert uses a pulsing LIVE orb and pulsing red perimeter/glow and opens the existing Live page when tapped.
- YouTube description parsing now recognizes `Team <name>` and round text such as `November 2026 Round 1`.
- Home alert headline/subtext use those parsed values, with safe fallbacks if either is omitted.
- YouTube live push notifications now use the exact same headline and subtext as the Home live alert.
