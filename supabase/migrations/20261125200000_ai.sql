-- T06: AI reports (action plan and change summary), per-user daily AI quota and atomic audit rate limit.
-- No privileges are granted to anon.

-- ai_reports: one report of each kind per audit, owned by the audit's user.
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('plan', 'changes')),
  content jsonb not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (audit_id, kind)
);

-- The unique (audit_id, kind) index already covers lookups by audit_id.
create index ai_reports_user_id_idx on public.ai_reports (user_id);

alter table public.ai_reports enable row level security;

create policy "ai_reports_select_own" on public.ai_reports
  for select to authenticated
  using (user_id = auth.uid());

create policy "ai_reports_insert_own" on public.ai_reports
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.audits a
      where a.id = audit_id and a.user_id = auth.uid()
    )
  );

create policy "ai_reports_update_own" on public.ai_reports
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.audits a
      where a.id = audit_id and a.user_id = auth.uid()
    )
  );

create policy "ai_reports_delete_own" on public.ai_reports
  for delete to authenticated
  using (user_id = auth.uid());

-- ai_usage: number of AI generations per user and day (Europe/Madrid).
-- Read-only for the user (D-SEC-09): only the security definer functions below write it.
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  count int not null default 0 check (count >= 0),
  refunds int not null default 0 check (refunds >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using (user_id = auth.uid());

-- Atomically adds one generation for the current user and day.
-- Returns the new count, or -1 when the limit was already reached (the row is left untouched).
-- The limit is capped at 10 so a direct call with a huge p_limit cannot bypass it.
create function public.consume_ai_quota(p_limit int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit int := least(coalesce(p_limit, 0), 10);
  v_count int;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if v_limit < 1 then
    return -1;
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (v_user, (now() at time zone 'Europe/Madrid')::date, 1)
  on conflict (user_id, day) do update
    set count = ai_usage.count + 1
    where ai_usage.count < v_limit
  returning ai_usage.count into v_count;

  return coalesce(v_count, -1);
end;
$$;

-- Gives back one generation of today (never below 0) when the model or the save failed.
-- At most 3 refunds per user and day, so direct calls can only add 3 extra generations.
create function public.refund_ai_quota()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set count = greatest(count - 1, 0),
      refunds = refunds + 1
  where user_id = auth.uid()
    and day = (now() at time zone 'Europe/Madrid')::date
    and count > 0
    and refunds < 3;
$$;

-- Atomic audit rate limit: one audit per site and minute, using the database clock.
alter table public.sites add column last_audit_started_at timestamptz;

create function public.claim_audit_slot(p_site_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.sites
  set last_audit_started_at = now()
  where id = p_site_id
    and user_id = auth.uid()
    and (last_audit_started_at is null or last_audit_started_at < now() - interval '60 seconds')
  returning id into v_id;

  return v_id is not null;
end;
$$;

-- Grants
grant select, insert, update, delete on public.ai_reports to authenticated;

revoke insert, update, delete on public.ai_usage from authenticated;
grant select on public.ai_usage to authenticated;

-- last_audit_started_at is only written by claim_audit_slot (neither on create nor on update).
revoke insert, update on public.sites from authenticated;
grant insert (user_id, url, name) on public.sites to authenticated;
grant update (url, name) on public.sites to authenticated;

revoke execute on function public.consume_ai_quota(int) from public, anon;
revoke execute on function public.refund_ai_quota() from public, anon;
revoke execute on function public.claim_audit_slot(uuid) from public, anon;
grant execute on function public.consume_ai_quota(int) to authenticated;
grant execute on function public.refund_ai_quota() to authenticated;
grant execute on function public.claim_audit_slot(uuid) to authenticated;
