create table if not exists public.admin_sim_block_slots (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Unavailable',
  weekday smallint not null check (weekday between 0 and 6),
  start_time time without time zone not null,
  duration_hours smallint not null check (duration_hours between 1 and 24),
  start_date date not null,
  end_date date not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.bookings add column if not exists admin_sim_block_slot_id uuid references public.admin_sim_block_slots(id) on delete set null;
create index if not exists bookings_admin_sim_block_slot_id_idx on public.bookings(admin_sim_block_slot_id);

alter table public.admin_sim_block_slots enable row level security;
drop policy if exists admin_sim_block_slots_admin_all on public.admin_sim_block_slots;
create policy admin_sim_block_slots_admin_all on public.admin_sim_block_slots for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create or replace function public.set_admin_sim_block_slot(p_slot_id uuid,p_title text,p_weekday smallint,p_start_time time without time zone,p_duration_hours smallint,p_start_date date,p_end_date date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_slot public.admin_sim_block_slots%rowtype; v_day date; v_start timestamptz; v_end timestamptz; v_count integer:=0; v_conflict record;
begin
 if v_uid is null or not public.is_admin(v_uid) then raise exception 'Administrator access required'; end if;
 if p_weekday not between 0 and 6 then raise exception 'Weekday must be between 0 and 6'; end if;
 if p_duration_hours is null or p_duration_hours<1 or p_duration_hours>24 then raise exception 'Hours reserved must be between 1 and 24'; end if;
 if p_end_date<p_start_date then raise exception 'End date must be on or after start date'; end if;
 if p_slot_id is null then insert into public.admin_sim_block_slots(title,weekday,start_time,duration_hours,start_date,end_date,created_by,updated_by) values(coalesce(nullif(trim(p_title),''),'Unavailable'),p_weekday,p_start_time,p_duration_hours,p_start_date,p_end_date,v_uid,v_uid) returning * into v_slot;
 else update public.admin_sim_block_slots set title=coalesce(nullif(trim(p_title),''),'Unavailable'),weekday=p_weekday,start_time=p_start_time,duration_hours=p_duration_hours,start_date=p_start_date,end_date=p_end_date,updated_by=v_uid,updated_at=now() where id=p_slot_id returning * into v_slot; if not found then raise exception 'Recurring simulator block not found'; end if; end if;
 delete from public.bookings where admin_sim_block_slot_id=v_slot.id and start_at>=now();
 for v_day in select d::date from generate_series(p_start_date::timestamp,p_end_date::timestamp,interval '1 day') d where extract(dow from d)::smallint=p_weekday and d::date>=current_date order by d loop
   v_start:=(v_day+p_start_time) at time zone 'America/New_York'; v_end:=v_start+(p_duration_hours||' hours')::interval;
   select b.id into v_conflict from public.bookings b where b.status='active' and b.start_at<v_end and b.end_at>v_start and b.admin_sim_block_slot_id is distinct from v_slot.id limit 1;
   if found then raise exception 'Schedule conflict on % from % to %',to_char(v_start at time zone 'America/New_York','FMDay, FMMonth DD, YYYY'),to_char(v_start at time zone 'America/New_York','FMHH12:MI AM'),to_char(v_end at time zone 'America/New_York','FMHH12:MI AM'); end if;
   insert into public.bookings(kind,status,title,start_at,end_at,created_by,admin_sim_block_slot_id) values('blocked','active',v_slot.title,v_start,v_end,v_uid,v_slot.id); v_count:=v_count+1;
 end loop;
 return jsonb_build_object('slot_id',v_slot.id,'bookings_created',v_count);
end; $$;

create or replace function public.clear_admin_sim_block_slot(p_slot_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin(auth.uid()) then raise exception 'Administrator access required'; end if;
 delete from public.bookings where admin_sim_block_slot_id=p_slot_id and start_at>=now();
 delete from public.admin_sim_block_slots where id=p_slot_id;
end; $$;

grant execute on function public.set_admin_sim_block_slot(uuid,text,smallint,time without time zone,smallint,date,date) to authenticated;
grant execute on function public.clear_admin_sim_block_slot(uuid) to authenticated;
