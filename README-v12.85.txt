Golf League App v12.85

Fixes Vercel TypeScript build error introduced by the v12.84 failure audio alert.
- AudioContext is now assigned to a locally narrowed non-null variable before state/resume checks.
- No scorecard validation behavior was changed.
- Red failed-validation box/X and failure tone remain enabled.
