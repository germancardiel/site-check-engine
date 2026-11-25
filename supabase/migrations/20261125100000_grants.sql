-- T04: table privileges for signed-in users. RLS policies (init migration) still restrict rows to the owner.
-- No privileges are granted to anon.

grant select, insert, update, delete on public.sites, public.audits to authenticated;
