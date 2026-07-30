-- Schema inicial para migrar Gestor QA desde SQLite JSON a Supabase Postgres.
-- Mantiene la forma actual de la app: cada entidad guarda su payload completo en jsonb.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."useCases" (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."testCases" (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bugs (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."spMigrations" (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_payload_gin on public.members using gin (payload);
create index if not exists use_cases_payload_gin on public."useCases" using gin (payload);
create index if not exists test_cases_payload_gin on public."testCases" using gin (payload);
create index if not exists bugs_payload_gin on public.bugs using gin (payload);
create index if not exists tasks_payload_gin on public.tasks using gin (payload);
create index if not exists sp_migrations_payload_gin on public."spMigrations" using gin (payload);
create index if not exists catalogs_payload_gin on public.catalogs using gin (payload);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.payload = jsonb_set(
    jsonb_set(coalesce(new.payload, '{}'::jsonb), '{id}', to_jsonb(new.id::text), true),
    '{updatedAt}',
    to_jsonb(to_char(new.updated_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS')),
    true
  );
  if old is null then
    new.payload = jsonb_set(
      new.payload,
      '{createdAt}',
      to_jsonb(to_char(new.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS')),
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists touch_members_updated_at on public.members;
create trigger touch_members_updated_at
before insert or update on public.members
for each row execute function public.touch_updated_at();

drop trigger if exists touch_use_cases_updated_at on public."useCases";
create trigger touch_use_cases_updated_at
before insert or update on public."useCases"
for each row execute function public.touch_updated_at();

drop trigger if exists touch_test_cases_updated_at on public."testCases";
create trigger touch_test_cases_updated_at
before insert or update on public."testCases"
for each row execute function public.touch_updated_at();

drop trigger if exists touch_bugs_updated_at on public.bugs;
create trigger touch_bugs_updated_at
before insert or update on public.bugs
for each row execute function public.touch_updated_at();

drop trigger if exists touch_tasks_updated_at on public.tasks;
create trigger touch_tasks_updated_at
before insert or update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists touch_sp_migrations_updated_at on public."spMigrations";
create trigger touch_sp_migrations_updated_at
before insert or update on public."spMigrations"
for each row execute function public.touch_updated_at();

drop trigger if exists touch_catalogs_updated_at on public.catalogs;
create trigger touch_catalogs_updated_at
before insert or update on public.catalogs
for each row execute function public.touch_updated_at();

alter table public.members enable row level security;
alter table public."useCases" enable row level security;
alter table public."testCases" enable row level security;
alter table public.bugs enable row level security;
alter table public.tasks enable row level security;
alter table public."spMigrations" enable row level security;
alter table public.catalogs enable row level security;

-- Politicas iniciales: cualquier usuario autenticado puede leer y editar.
-- Para restringir a correos especificos, crear una tabla de perfiles/roles y reemplazar estas politicas.
create policy "authenticated members read" on public.members for select to authenticated using (true);
create policy "authenticated members write" on public.members for all to authenticated using (true) with check (true);

create policy "authenticated useCases read" on public."useCases" for select to authenticated using (true);
create policy "authenticated useCases write" on public."useCases" for all to authenticated using (true) with check (true);

create policy "authenticated testCases read" on public."testCases" for select to authenticated using (true);
create policy "authenticated testCases write" on public."testCases" for all to authenticated using (true) with check (true);

create policy "authenticated bugs read" on public.bugs for select to authenticated using (true);
create policy "authenticated bugs write" on public.bugs for all to authenticated using (true) with check (true);

create policy "authenticated tasks read" on public.tasks for select to authenticated using (true);
create policy "authenticated tasks write" on public.tasks for all to authenticated using (true) with check (true);

create policy "authenticated spMigrations read" on public."spMigrations" for select to authenticated using (true);
create policy "authenticated spMigrations write" on public."spMigrations" for all to authenticated using (true) with check (true);

create policy "authenticated catalogs read" on public.catalogs for select to authenticated using (true);
create policy "authenticated catalogs write" on public.catalogs for all to authenticated using (true) with check (true);

-- Consola SQL usada por el endpoint serverless /api/sql-console.
-- Ejecuta una sola sentencia DML por solicitud y devuelve filas para SELECT o RETURNING.
create or replace function public.run_sql_console(query_text text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
set statement_timeout = '10s'
as $$
declare
  statement text := trim(coalesce(query_text, ''));
  command text;
  rows_result jsonb := '[]'::jsonb;
  affected_count integer := 0;
begin
  statement := regexp_replace(statement, '\s*;\s*$', '');

  if statement = '' then
    raise exception 'La consulta SQL esta vacia.';
  end if;

  if statement ~ ';' then
    raise exception 'La consola permite una sola sentencia SQL por ejecucion.';
  end if;

  command := lower((regexp_match(statement, '^\s*([a-zA-Z]+)'))[1]);

  if command not in ('select', 'with', 'insert', 'update', 'delete') then
    raise exception 'Sentencia no permitida: %. Usa SELECT, WITH, INSERT, UPDATE o DELETE.', coalesce(command, '');
  end if;

  if command in ('select', 'with') then
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(sql_console_result)), ''[]''::jsonb), count(*)::int from (%s) sql_console_result',
      statement
    )
    into rows_result, affected_count;
  elsif statement ~* '\breturning\b' then
    execute format(
      'with sql_console_result as (%s) select coalesce(jsonb_agg(to_jsonb(sql_console_result)), ''[]''::jsonb), count(*)::int from sql_console_result',
      statement
    )
    into rows_result, affected_count;
  else
    execute statement;
    get diagnostics affected_count = row_count;
  end if;

  return jsonb_build_object(
    'command', upper(command),
    'rowCount', affected_count,
    'rows', rows_result
  );
end;
$$;

revoke all on function public.run_sql_console(text) from public;
revoke all on function public.run_sql_console(text) from anon;
revoke all on function public.run_sql_console(text) from authenticated;
grant execute on function public.run_sql_console(text) to service_role;
