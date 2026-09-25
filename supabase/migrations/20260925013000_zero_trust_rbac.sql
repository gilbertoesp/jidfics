-- Zero-trust RBAC + OAuth 2.0 delegation substrate (phase 7)
--
-- Tiered claims : user < admin < super_admin (enum catalog order = rank order,
--                 mirroring ROLE_RANK in lib/auth/rbac.ts)
-- Clients       : oauth_clients is service-role only (no RLS policy = no anon
--                 or authenticated read) — secrets never leave the server
-- Revocation    : token_denylist keyed by jti, checked on every verification
-- Audit         : audit_log append-only via service role, readable by super_admin

create type public.app_role as enum ('user', 'admin', 'super_admin');

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

create table public.oauth_clients (
  client_id text primary key,
  client_secret_hash text not null,
  tier public.app_role not null default 'user',
  allowed_scopes text[] not null default '{}',
  allowed_audiences text[] not null default '{}',
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.token_denylist (
  jti uuid primary key,
  expires_at timestamptz not null,
  revoked_by uuid,
  reason text,
  created_at timestamptz not null default now()
);

create index token_denylist_expires_at_idx
  on public.token_denylist (expires_at);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor text,
  actor_role public.app_role,
  action text not null,
  resource text,
  scope text,
  jti uuid,
  ip text,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_jti_idx on public.audit_log (jti);

-- Self-role lookup without RLS recursion (security-definer, fixed search_path)
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role >= _role
  );
$$;

revoke execute on function public.has_role(public.app_role) from public;
revoke execute on function public.has_role(public.app_role) from anon;
grant execute on function public.has_role(public.app_role) to authenticated;

-- RLS: deny by default (absent policy = no access for anon/authenticated)
alter table public.user_roles enable row level security;
alter table public.oauth_clients enable row level security;
alter table public.token_denylist enable row level security;
alter table public.audit_log enable row level security;

create policy "users_read_own_role"
  on public.user_roles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "super_admin_read_roles"
  on public.user_roles
  for select
  to authenticated
  using (public.has_role('super_admin'));

create policy "super_admin_read_audit_log"
  on public.audit_log
  for select
  to authenticated
  using (public.has_role('super_admin'));

-- oauth_clients and token_denylist intentionally carry NO policies:
-- only the service role (server-side token endpoint) may touch them.
