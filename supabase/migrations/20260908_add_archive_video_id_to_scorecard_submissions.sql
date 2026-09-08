alter table public.round_score_submissions
  add column if not exists archive_video_id text;

create index if not exists idx_round_score_submissions_archive_video_id
  on public.round_score_submissions (archive_video_id)
  where archive_video_id is not null;
