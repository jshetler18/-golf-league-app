v13.36 - Rules page live refresh fix

Problem:
- Admin edits to League Rules were saved in Supabase, but an already-open app could continue showing the old rules until the Rules page was fully remounted.

Fix:
- Rules page now reloads the league_rules record:
  1. when the page opens,
  2. whenever the app/browser regains focus,
  3. whenever the app returns from the background,
  4. immediately when Supabase sends an UPDATE event for league_rules.
- This means edits made in Admin > Rules should appear without requiring users to force-close/reinstall the app.
- Existing v13.35 mobile tee guideline table and color squares remain unchanged.
- No database changes.
