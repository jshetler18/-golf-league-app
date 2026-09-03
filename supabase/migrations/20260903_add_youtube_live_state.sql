create table if not exists public.youtube_live_state (
  id smallint primary key default 1 check (id = 1),
  is_live boolean not null default false,
  video_id text,
  title text,
  description text,
  started_at timestamptz,
  thumbnail text,
  channel_id text,
  channel_title text,
  matched_team text,
  round_text text,
  live_headline text,
  live_subtext text,
  checked_at timestamptz not null default now()
);
alter table public.youtube_live_state enable row level security;
insert into public.youtube_live_state (id,is_live,checked_at) values (1,false,now()) on conflict (id) do nothing;
revoke all on table public.youtube_live_state from anon, authenticated;
