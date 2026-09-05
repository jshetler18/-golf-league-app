drop policy if exists "linked players submit own team round" on public.round_score_submissions;
create policy "approved linked players submit active team round"
on public.round_score_submissions
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and pr.status = 'approved'::user_status
      and pr.player_id is not null
  )
  and exists (
    select 1
    from public.teams t
    join public.seasons s on s.id = t.season_id
    where t.id = round_score_submissions.team_id
      and coalesce(t.is_active, true)
      and s.is_active = true
      and s.is_closed = false
  )
);

drop policy if exists "linked players resubmit rejected own team round" on public.round_score_submissions;
create policy "approved linked players resubmit rejected team round"
on public.round_score_submissions
for update
to authenticated
using (
  status = 'rejected'
  and exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and pr.status = 'approved'::user_status
      and pr.player_id is not null
  )
)
with check (
  submitted_by = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.teams t
    join public.seasons s on s.id = t.season_id
    where t.id = round_score_submissions.team_id
      and coalesce(t.is_active, true)
      and s.is_active = true
      and s.is_closed = false
  )
);
