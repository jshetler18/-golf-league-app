create table if not exists public.league_rules (
  id smallint primary key default 1 check (id = 1),
  page_title text not null default 'League Rules',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id) on delete set null
);

alter table public.league_rules enable row level security;

drop policy if exists "league rules readable" on public.league_rules;
create policy "league rules readable"
on public.league_rules for select
to anon, authenticated
using (true);

drop policy if exists "admins manage league rules" on public.league_rules;
create policy "admins manage league rules"
on public.league_rules for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.league_rules (id, page_title, sections)
values (
  1,
  'League Rules',
  '[
    {"heading":"Monthly Format","body":"Each team plays one round per week for four rounds each month. The first 10 holes use Stableford scoring, with two designated bonus par-3 holes from the back nine."},
    {"heading":"Stableford Points","body":"Albatross 5 · Eagle 4 · Birdie 3 · Par 2 · Bogey 1 · Double bogey or worse 0."},
    {"heading":"Week 4 Match Play & Cup Points","body":"Seeds 1–2 award 1,000/800; 3–4 award 700/600; 5–6 award 500/400; 7–8 award 300/200; 9–10 award 100/0. Ties are resolved by the league administrator."},
    {"heading":"Official Weekly Score","body":"Raw Stableford + bonus points + monthly team handicap."}
  ]'::jsonb
)
on conflict (id) do nothing;
