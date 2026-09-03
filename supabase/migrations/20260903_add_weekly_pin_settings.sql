alter table public.league_months
  add column if not exists pins_week_1 text,
  add column if not exists pins_week_2 text,
  add column if not exists pins_week_3 text,
  add column if not exists pins_week_4 text;

comment on column public.league_months.pins_week_1 is 'GSPro pin setting required for league Week 1';
comment on column public.league_months.pins_week_2 is 'GSPro pin setting required for league Week 2';
comment on column public.league_months.pins_week_3 is 'GSPro pin setting required for league Week 3';
comment on column public.league_months.pins_week_4 is 'GSPro pin setting required for league Week 4';
