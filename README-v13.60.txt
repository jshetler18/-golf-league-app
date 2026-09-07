v13.60 - Monthly Setup pin defaults and save verification

Weekly Pin Settings
- Week 1 defaults to Thursday.
- Week 2 defaults to Friday.
- Week 3 defaults to Saturday.
- Week 4 defaults to Sunday.
- Each week is now a dropdown with Thursday, Friday, Saturday, and Sunday.
- Existing months with blank pin values use these defaults.
- round_pin_days is saved in the same Week 1-4 order.

Monthly Setup save reliability
- The league_months update now requests the saved row back from Supabase.
- The app verifies the saved course name before continuing.
- Save errors are shown instead of allowing a false success message.
- After all monthly setup data saves, the page reloads that month from Supabase before showing success.
- Success message now says the setup was saved and verified.

Live database check performed:
- December 2026 currently stored course name was Green Briar at the time of inspection.
- Existing 2026-27 league_month rows were backfilled so blank weekly pin fields now use Thursday / Friday / Saturday / Sunday.
