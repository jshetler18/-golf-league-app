v13.69 - Rolling Monthly Handicap System

Formula
- Handicap Standard defaults to 27 and can be changed by admin.
- 3-4 available rounds: all count.
- 5-7: lowest 1 is dropped.
- 8-11: lowest 2 are dropped.
- 12+: only latest 12 are considered; lowest 2 are dropped. The remaining 10 are weighted by recency: newest 4 = 50%, next 4 = 30%, oldest 2 = 20%.
- Recommended handicap = max(0, round(Handicap Standard - calculated average)).
- Handicap remains a whole number and is confirmed for the selected month.

Player Teams page
- Adds Handicap Performance above Raw Score Statistics.
- Shows recent score cards, Counted/Not Counted status, and calculated handicap average.

Admin Assign Courses to Months
- Adds Monthly Handicap Recommendations above Team Handicaps.
- Shows the exact score set used for every team, Counted/Not Counted status, average, and recommended handicap.
- "Use +N" copies the recommendation into that month's handicap selector; admin can still override.
- Handicap Standard can be edited and all recommendations recalculate immediately.

Rules
- Live Monthly Team Handicap rule updated in Supabase with a plain-language explanation.

Database
- seasons.handicap_standard numeric default 27 added live and verified.
