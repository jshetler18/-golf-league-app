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
