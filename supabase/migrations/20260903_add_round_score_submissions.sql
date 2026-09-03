create table if not exists public.round_score_submissions (
  id uuid primary key default gen_random_uuid(),
  league_month_id uuid not null references public.league_months(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 4),
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  image_path text,
  hole_scores jsonb not null default '[]'::jsonb,
  hole_pars jsonb not null default '[]'::jsonb,
  stableford_points jsonb not null default '[]'::jsonb,
  raw_stableford numeric not null default 0,
  bonus_birdies integer not null default 0,
  bonus_points numeric not null default 0,
  handicap_points numeric not null default 0,
  official_total numeric not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_month_id, team_id, week_number)
);
alter table public.round_score_submissions enable row level security;
create policy "approved players view league round submissions" on public.round_score_submissions for select to authenticated using (
  public.is_admin(auth.uid()) or exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='approved')
);
create policy "linked players submit own team round" on public.round_score_submissions for insert to authenticated with check (
  submitted_by=auth.uid() and exists(
    select 1 from public.profiles pr join public.players pl on pl.id=pr.player_id
    where pr.id=auth.uid() and pr.status='approved' and pl.team_id=round_score_submissions.team_id
  )
);
create policy "linked players update pending own team round" on public.round_score_submissions for update to authenticated using (
  status='pending' and submitted_by=auth.uid()
) with check (submitted_by=auth.uid());
create policy "admins manage round submissions" on public.round_score_submissions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('round-scorecards','round-scorecards',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy "authenticated upload round scorecards" on storage.objects for insert to authenticated with check (bucket_id='round-scorecards' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "owners read own round scorecards" on storage.objects for select to authenticated using (bucket_id='round-scorecards' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin(auth.uid())));
create policy "owners update own round scorecards" on storage.objects for update to authenticated using (bucket_id='round-scorecards' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='round-scorecards' and (storage.foldername(name))[1]=auth.uid()::text);
