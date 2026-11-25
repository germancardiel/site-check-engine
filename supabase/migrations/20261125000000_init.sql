-- T02: initial schema. Sites and audits owned by the authenticated user, protected by RLS.

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  url text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  status text not null check (status in ('ok', 'error')),
  score int check (score between 0 and 100),
  seo_score int check (seo_score between 0 and 100),
  ai_score int check (ai_score between 0 and 100),
  checks jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now()
);

create index sites_user_id_idx on public.sites (user_id);
create index audits_user_id_idx on public.audits (user_id);
create index audits_site_id_created_at_idx on public.audits (site_id, created_at desc);

alter table public.sites enable row level security;
alter table public.audits enable row level security;

-- sites
create policy "sites_select_own" on public.sites
  for select to authenticated
  using (user_id = auth.uid());

create policy "sites_insert_own" on public.sites
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "sites_update_own" on public.sites
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sites_delete_own" on public.sites
  for delete to authenticated
  using (user_id = auth.uid());

-- audits
create policy "audits_select_own" on public.audits
  for select to authenticated
  using (user_id = auth.uid());

create policy "audits_insert_own" on public.audits
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sites s
      where s.id = site_id and s.user_id = auth.uid()
    )
  );

create policy "audits_update_own" on public.audits
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sites s
      where s.id = site_id and s.user_id = auth.uid()
    )
  );

create policy "audits_delete_own" on public.audits
  for delete to authenticated
  using (user_id = auth.uid());
