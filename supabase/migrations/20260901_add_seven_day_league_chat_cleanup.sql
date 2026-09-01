-- Version 12.16: automatically remove League Chat threads after 7 days.
-- Replies and reactions are removed automatically by existing ON DELETE CASCADE constraints.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'league-chat-7-day-cleanup') then
    perform cron.unschedule('league-chat-7-day-cleanup');
  end if;
end $$;

select cron.schedule(
  'league-chat-7-day-cleanup',
  '17 * * * *',
  $$delete from public.chat_posts
    where parent_id is null
      and created_at < now() - interval '7 days';$$
);
