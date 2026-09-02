create table if not exists public.team_sim_slots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_hours smallint not null default 3 check (duration_hours between 1 and 6),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, team_id)
);

alter table public.team_sim_slots enable row level security;

drop policy if exists team_sim_slots_admin_all on public.team_sim_slots;
create policy team_sim_slots_admin_all
on public.team_sim_slots
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

alter table public.bookings
  add column if not exists team_sim_slot_id uuid references public.team_sim_slots(id) on delete set null;

create unique index if not exists bookings_team_sim_slot_start_unique
on public.bookings(team_sim_slot_id, start_at)
where team_sim_slot_id is not null;

create or replace function public.set_team_sim_slot(
  p_team_id uuid,
  p_weekday smallint,
  p_start_time time,
  p_duration_hours smallint default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_team public.teams%rowtype;
  v_season public.seasons%rowtype;
  v_slot public.team_sim_slots%rowtype;
  v_day date;
  v_start timestamptz;
  v_end timestamptz;
  v_count integer := 0;
  v_conflict record;
begin
  if v_uid is null or not public.is_admin(v_uid) then
    raise exception 'Administrator access required';
  end if;
  if p_weekday < 0 or p_weekday > 6 then
    raise exception 'Weekday must be between 0 and 6';
  end if;
  if p_duration_hours <> 3 then
    raise exception 'League team simulator blocks must be 3 hours';
  end if;

  select * into v_team from public.teams where id = p_team_id;
  if not found then raise exception 'Team not found'; end if;
  select * into v_season from public.seasons where id = v_team.season_id;
  if not found or v_season.start_date is null or v_season.end_date is null then
    raise exception 'Season dates must be configured first';
  end if;

  insert into public.team_sim_slots(season_id,team_id,weekday,start_time,duration_hours,created_by,updated_by)
  values(v_team.season_id,p_team_id,p_weekday,p_start_time,3,v_uid,v_uid)
  on conflict(season_id,team_id) do update
    set weekday=excluded.weekday,start_time=excluded.start_time,duration_hours=3,updated_by=v_uid,updated_at=now()
  returning * into v_slot;

  delete from public.bookings
   where team_sim_slot_id=v_slot.id
     and start_at >= now();

  for v_day in
    select d::date
    from generate_series(v_season.start_date::timestamp, v_season.end_date::timestamp, interval '1 day') d
    where extract(dow from d)::smallint = p_weekday
      and d::date >= current_date
    order by d
  loop
    v_start := (v_day + p_start_time) at time zone 'America/New_York';
    v_end := v_start + interval '3 hours';

    select b.id,b.start_at,b.end_at,b.title into v_conflict
    from public.bookings b
    where b.status='active'
      and b.start_at < v_end
      and b.end_at > v_start
      and (b.team_sim_slot_id is distinct from v_slot.id)
    order by b.start_at
    limit 1;

    if found then
      raise exception 'Schedule conflict on % from % to %',
        to_char(v_start at time zone 'America/New_York','FMDay, FMMonth DD, YYYY'),
        to_char(v_start at time zone 'America/New_York','FMHH12:MI AM'),
        to_char(v_end at time zone 'America/New_York','FMHH12:MI AM');
    end if;

    insert into public.bookings(kind,status,team_id,title,start_at,end_at,created_by,team_sim_slot_id)
    values('league','active',p_team_id,v_team.name || ' – League Round',v_start,v_end,v_uid,v_slot.id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('slot_id',v_slot.id,'bookings_created',v_count);
end;
$$;

create or replace function public.clear_team_sim_slot(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot_id uuid;
begin
  if v_uid is null or not public.is_admin(v_uid) then
    raise exception 'Administrator access required';
  end if;
  select id into v_slot_id from public.team_sim_slots where team_id=p_team_id;
  if v_slot_id is null then return; end if;
  delete from public.bookings where team_sim_slot_id=v_slot_id and start_at >= now();
  delete from public.team_sim_slots where id=v_slot_id;
end;
$$;

revoke all on function public.set_team_sim_slot(uuid,smallint,time,smallint) from public, anon;
grant execute on function public.set_team_sim_slot(uuid,smallint,time,smallint) to authenticated;
revoke all on function public.clear_team_sim_slot(uuid) from public, anon;
grant execute on function public.clear_team_sim_slot(uuid) to authenticated;
