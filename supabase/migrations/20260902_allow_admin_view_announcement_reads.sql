create policy "announcement_reads_admin_select"
on public.announcement_reads
for select
to authenticated
using (public.is_admin(auth.uid()));
