v13.133 — Remove Admin Home back buttons
- Removed the Admin Home back link from the shared AdminFrame component entirely.
- This guarantees it cannot appear inside pages loaded under the Admin Home navigation workspace.
- Existing inline workspace and single-scroll behavior from v13.132 is preserved.
