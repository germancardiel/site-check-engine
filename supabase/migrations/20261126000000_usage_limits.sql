-- T16: per-user usage limits enforced in the database (D-SEC-10) and audits made read-only.
--   * 15 audits per user and day (Europe/Madrid), consumed atomically together with the
--     1-minute per-site cooldown by start_audit(). A cooldown rejection never spends quota.
--   * At most 10 sites per user (before insert trigger, serialized per user).
--   * authenticated can no longer update audits (the app never does).
-- No privileges are granted to anon.

-- audit_usage: number of audits started per user and day (Europe/Madrid).
-- Keyed by user (not by site), so deleting and re-creating a site does not reset it.
-- Read-only for the user (D-SEC-09): only start_audit() writes it.
create table public.audit_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  count int not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.audit_usage enable row level security;

create policy "audit_usage_select_own" on public.audit_usage
  for select to authenticated
  using (user_id = auth.uid());

-- Starts an audit of p_site_id for the current user, in one transaction:
--   1. Locks today's usage row of the user and checks the daily quota (capped at 15).
--   2. Claims the 1-minute slot of the site (database clock).
--   3. Only if both succeed, adds one audit to today's count.
-- Returns 'ok', 'quota' (daily limit reached), 'cooldown' (site audited < 60 s ago)
-- or 'not_found' (no such site for this user). Nothing is written unless it returns 'ok'.
create function public.start_audit(p_site_id uuid, p_limit int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit int := least(coalesce(p_limit, 0), 15);
  v_day date := (now() at time zone 'Europe/Madrid')::date;
  v_count int;
  v_site uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.sites where id = p_site_id and user_id = v_user) then
    return 'not_found';
  end if;

  insert into public.audit_usage (user_id, day, count)
  values (v_user, v_day, 0)
  on conflict (user_id, day) do nothing;

  -- Row lock: concurrent calls of the same user wait here, so the check below cannot race.
  select count into v_count
  from public.audit_usage
  where user_id = v_user and day = v_day
  for update;

  if v_limit < 1 or v_count >= v_limit then
    return 'quota';
  end if;

  update public.sites
  set last_audit_started_at = now()
  where id = p_site_id
    and user_id = v_user
    and (last_audit_started_at is null or last_audit_started_at < now() - interval '60 seconds')
  returning id into v_site;

  if v_site is null then
    return 'cooldown';
  end if;

  update public.audit_usage
  set count = count + 1
  where user_id = v_user and day = v_day;

  return 'ok';
end;
$$;

-- Site cap: at most 10 sites per user. The advisory lock serializes concurrent inserts
-- of the same user until the end of the transaction, so two inserts cannot both see 9.
create function public.enforce_site_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('sites:' || new.user_id::text));
  if (select count(*) from public.sites where user_id = new.user_id) >= 10 then
    raise exception 'site_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger sites_enforce_limit
  before insert on public.sites
  for each row execute function public.enforce_site_limit();

-- Grants
revoke insert, update, delete on public.audit_usage from authenticated;
grant select on public.audit_usage to authenticated;

-- The code never updates audits (they are immutable records).
revoke update on public.audits from authenticated;

-- start_audit replaces claim_audit_slot (which did not consume the daily quota).
revoke execute on function public.claim_audit_slot(uuid) from authenticated;

revoke execute on function public.start_audit(uuid, int) from public, anon;
grant execute on function public.start_audit(uuid, int) to authenticated;
revoke execute on function public.enforce_site_limit() from public, anon, authenticated;
