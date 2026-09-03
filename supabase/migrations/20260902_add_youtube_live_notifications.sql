-- v12.60: deduplicate automatic YouTube livestream push notifications.
create table if not exists public.youtube_live_notifications (
  video_id text primary key,
  title text,
  detected_at timestamptz not null default now(),
  notified_at timestamptz,
  sent_count integer not null default 0
);

alter table public.youtube_live_notifications enable row level security;
-- No client policies: this table is intentionally server-only and is accessed with the Supabase secret key.
