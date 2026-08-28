-- Generic key-value store for apps/lab experiments (public, unauthenticated site).
-- Isolated from every other table: RLS here only ever exposes this table's rows.
create table if not exists public.lab_kv (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lab_kv enable row level security;

create policy "lab_kv anon select" on public.lab_kv
  for select to anon using (true);

create policy "lab_kv anon insert" on public.lab_kv
  for insert to anon with check (true);

create policy "lab_kv anon update" on public.lab_kv
  for update to anon using (true) with check (true);

create policy "lab_kv anon delete" on public.lab_kv
  for delete to anon using (true);
