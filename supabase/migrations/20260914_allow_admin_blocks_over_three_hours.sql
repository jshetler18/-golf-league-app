-- Allow administrator-created blocked simulator time to exceed the 3-hour player booking limit.
-- Personal player reservations remain limited to 3 hours per booking and per day.
create or replace function public.enforce_booking_rules()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  local_start timestamp;
  local_end timestamp;
  booked_hours numeric;
begin
  if new.status <> 'active' then
    return new;
  end if;

  local_start := new.start_at at time zone 'America/New_York';
  local_end := new.end_at at time zone 'America/New_York';

  if local_start::date <> local_end::date and local_end::time <> time '00:00' then
    raise exception 'Bookings must remain within one calendar day';
  end if;

  if local_start::time < time '07:00' or local_end::time > time '21:00' then
    raise exception 'Simulator bookings must be between 7:00 AM and 9:00 PM Eastern Time';
  end if;

  if new.kind = 'personal'
     and extract(epoch from (new.end_at - new.start_at))/3600 > 3 then
    raise exception 'A single booking cannot exceed 3 hours';
  end if;

  if new.kind = 'personal' then
    if not public.is_approved_booker(new.user_id) and not public.is_admin(auth.uid()) then
      raise exception 'User is not approved to book the simulator';
    end if;

    if new.start_at > now() + interval '30 days' and not public.is_admin(auth.uid()) then
      raise exception 'Bookings may only be made up to 30 days in advance';
    end if;

    select coalesce(sum(extract(epoch from (b.end_at - b.start_at))/3600),0)
      into booked_hours
    from public.bookings b
    where b.user_id = new.user_id
      and b.kind = 'personal'
      and b.status = 'active'
      and (b.start_at at time zone 'America/New_York')::date = local_start::date
      and b.id <> coalesce(new.id, gen_random_uuid());

    if booked_hours + extract(epoch from (new.end_at - new.start_at))/3600 > 3 then
      raise exception 'Users may book no more than 3 total hours per day';
    end if;
  end if;

  if exists (
    select 1 from public.bookings b
    where b.status = 'active'
      and b.id <> coalesce(new.id, gen_random_uuid())
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then
    raise exception 'That simulator time is already reserved';
  end if;

  return new;
end;
$function$;
