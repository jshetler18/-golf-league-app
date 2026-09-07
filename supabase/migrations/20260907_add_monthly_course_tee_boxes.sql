create table if not exists public.course_tee_boxes (
  id uuid primary key default gen_random_uuid(),
  league_month_id uuid not null references public.league_months(id) on delete cascade,
  tee_level text not null check (tee_level in ('turquoise','red','yellow','blue','black')),
  course_tee_color text not null,
  yardage integer not null check (yardage > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_month_id, tee_level)
);
alter table public.course_tee_boxes enable row level security;
grant select on public.course_tee_boxes to anon, authenticated;
grant insert, update, delete on public.course_tee_boxes to authenticated;
create policy "public_read_course_tee_boxes" on public.course_tee_boxes for select using (true);
create policy "admin_write_course_tee_boxes" on public.course_tee_boxes for all using (public.is_admin()) with check (public.is_admin());
