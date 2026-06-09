-- V21_00 — Fix #1: Clock In/Out persistence
-- Adds fleet.driver_time_entry + clock_in / clock_out / driver_current_time_entry RPCs.
-- Public wrappers forward to fleet.* so the anon-key PWA (public schema) can call them.
-- tenant_id is passed explicitly because execute_sql/anon context has no tenant.

create table if not exists fleet.driver_time_entry (
  time_entry_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default '00000000-0000-0000-0000-000000000001',
  driver_id uuid not null references fleet.driver(driver_id),
  vehicle_id uuid references fleet.vehicle(vehicle_id),
  trip_id uuid references fleet.trip(trip_id),
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  duration_minutes int generated always as (
    case when clock_out_at is not null
      then extract(epoch from (clock_out_at - clock_in_at))::int / 60
      else null end
  ) stored,
  entry_type text not null default 'driving' check (entry_type in ('driving','helper','shop','break','other')),
  source text not null default 'fieldpay',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists driver_time_entry_driver_idx on fleet.driver_time_entry (tenant_id, driver_id, clock_in_at desc);
create index if not exists driver_time_entry_trip_idx on fleet.driver_time_entry (trip_id);
create index if not exists driver_time_entry_open_idx on fleet.driver_time_entry (clock_out_at) where clock_out_at is null;

-- ── Clock in: insert open entry; stamp fleet.trip.actual_start if not already set ──
create or replace function fleet.clock_in(
  p_tenant_id uuid,
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_trip_id uuid,
  p_entry_type text default 'driving'
) returns uuid
language plpgsql
security definer
set search_path = fleet, public
as $$
declare
  v_id uuid;
begin
  -- Reuse an already-open entry for this driver rather than stacking duplicates.
  select time_entry_id into v_id
    from fleet.driver_time_entry
   where tenant_id = p_tenant_id
     and driver_id = p_driver_id
     and clock_out_at is null
   order by clock_in_at desc
   limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into fleet.driver_time_entry (tenant_id, driver_id, vehicle_id, trip_id, clock_in_at, entry_type)
  values (p_tenant_id, p_driver_id, p_vehicle_id, p_trip_id, now(), coalesce(p_entry_type,'driving'))
  returning time_entry_id into v_id;

  if p_trip_id is not null then
    update fleet.trip
       set actual_start = coalesce(actual_start, now())
     where trip_id = p_trip_id
       and tenant_id = p_tenant_id;
  end if;

  return v_id;
end;
$$;

-- ── Clock out: close the open entry; stamp fleet.trip.actual_end ──
create or replace function fleet.clock_out(
  p_tenant_id uuid,
  p_time_entry_id uuid,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = fleet, public
as $$
declare
  v_trip uuid;
begin
  update fleet.driver_time_entry
     set clock_out_at = now(),
         notes = coalesce(p_notes, notes),
         updated_at = now()
   where time_entry_id = p_time_entry_id
     and tenant_id = p_tenant_id
     and clock_out_at is null
  returning trip_id into v_trip;

  if v_trip is not null then
    update fleet.trip
       set actual_end = now()
     where trip_id = v_trip
       and tenant_id = p_tenant_id;
  end if;
end;
$$;

-- ── Current open entry for re-arming the UI after refresh / next shift ──
create or replace function fleet.driver_current_time_entry(
  p_tenant_id uuid,
  p_driver_id uuid
) returns table(
  time_entry_id uuid,
  clock_in_at timestamptz,
  trip_id uuid,
  vehicle_id uuid,
  entry_type text
)
language sql
security definer
set search_path = fleet, public
as $$
  select time_entry_id, clock_in_at, trip_id, vehicle_id, entry_type
    from fleet.driver_time_entry
   where tenant_id = p_tenant_id
     and driver_id = p_driver_id
     and clock_out_at is null
   order by clock_in_at desc
   limit 1;
$$;

-- ── Public wrappers (PWA calls public.* via PostgREST anon key) ──
create or replace function public.clock_in(
  p_tenant_id uuid,
  p_driver_id uuid,
  p_vehicle_id uuid,
  p_trip_id uuid,
  p_entry_type text default 'driving'
) returns uuid
language sql
security definer
set search_path = public, fleet
as $$ select fleet.clock_in(p_tenant_id, p_driver_id, p_vehicle_id, p_trip_id, p_entry_type); $$;

create or replace function public.clock_out(
  p_tenant_id uuid,
  p_time_entry_id uuid,
  p_notes text default null
) returns void
language sql
security definer
set search_path = public, fleet
as $$ select fleet.clock_out(p_tenant_id, p_time_entry_id, p_notes); $$;

create or replace function public.driver_current_time_entry(
  p_tenant_id uuid,
  p_driver_id uuid
) returns table(
  time_entry_id uuid,
  clock_in_at timestamptz,
  trip_id uuid,
  vehicle_id uuid,
  entry_type text
)
language sql
security definer
set search_path = public, fleet
as $$ select * from fleet.driver_current_time_entry(p_tenant_id, p_driver_id); $$;

grant execute on function fleet.clock_in(uuid,uuid,uuid,uuid,text) to authenticated, anon;
grant execute on function fleet.clock_out(uuid,uuid,text) to authenticated, anon;
grant execute on function fleet.driver_current_time_entry(uuid,uuid) to authenticated, anon;
grant execute on function public.clock_in(uuid,uuid,uuid,uuid,text) to authenticated, anon;
grant execute on function public.clock_out(uuid,uuid,text) to authenticated, anon;
grant execute on function public.driver_current_time_entry(uuid,uuid) to authenticated, anon;
