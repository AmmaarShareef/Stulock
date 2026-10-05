-- StuLock's operational data model and role-based admin boundary.
-- Apply with `supabase db push` after linking the project. This migration deliberately
-- stores derived session metrics only; raw camera feeds and biometric templates stay local.

create type public.admin_role as enum ('owner', 'admin', 'analyst', 'support');
create type public.account_status as enum ('active', 'suspended');
create type public.flag_status as enum ('open', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create table public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null default 'support',
  is_active boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  focus_minutes integer not null default 0 check (focus_minutes >= 0),
  score numeric(5,2) check (score between 0 and 100),
  violation_count integer not null default 0 check (violation_count >= 0),
  created_at timestamptz not null default now()
);

create table public.session_flags (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  category text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  note text,
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sessions_user_started_idx on public.sessions(user_id, started_at desc);
create index session_flags_open_idx on public.session_flags(status, created_at desc);
create index audit_created_idx on public.admin_audit_log(created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, last_sign_in_at)
  values (new.id, coalesce(new.email, ''), new.raw_user_meta_data ->> 'full_name', new.last_sign_in_at)
  on conflict (id) do update set email = excluded.email, last_sign_in_at = excluded.last_sign_in_at;
  return new;
end;
$$;
create trigger on_auth_user_created after insert or update of email, last_sign_in_at on auth.users for each row execute procedure public.handle_new_user();

-- Security-definer functions prevent RLS recursion while exposing only a boolean/role.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and is_active);
$$;
create or replace function public.admin_role()
returns public.admin_role language sql stable security definer set search_path = public as $$
  select role from public.admin_users where user_id = auth.uid() and is_active limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sessions enable row level security;
alter table public.session_flags enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "profiles: users read self, admins read all" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: users update self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins read their own membership" on public.admin_users for select using (user_id = auth.uid() or public.is_admin());
create policy "admins manage memberships" on public.admin_users for all using (public.admin_role() in ('owner', 'admin')) with check (public.admin_role() in ('owner', 'admin'));
create policy "subscriptions: owner or admin read" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy "sessions: owner or admin read" on public.sessions for select using (user_id = auth.uid() or public.is_admin());
create policy "sessions: owner writes own" on public.sessions for insert with check (user_id = auth.uid());
create policy "sessions: owner updates own" on public.sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "flags: admins read" on public.session_flags for select using (public.is_admin());
create policy "flags: analysts update" on public.session_flags for update using (public.admin_role() in ('owner', 'admin', 'analyst')) with check (public.admin_role() in ('owner', 'admin', 'analyst'));
create policy "audit: admins read" on public.admin_audit_log for select using (public.is_admin());

-- Lock down function execution to signed-in users only.
revoke all on function public.is_admin() from public;
revoke all on function public.admin_role() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_role() to authenticated;
