alter table public.profiles add column if not exists access_type text not null default 'league';
alter table public.profiles drop constraint if exists profiles_access_type_check;
alter table public.profiles add constraint profiles_access_type_check check (access_type in ('league','sim_only'));
