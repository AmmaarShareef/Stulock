-- Phase 4: privacy-preserving extension account links, aggregate sync, and an
-- optional leaderboard. No page address, title, DOM content, audio, video, or
-- biometric material exists in this schema.
create extension if not exists pgcrypto with schema extensions;

create table public.extension_sync_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null unique,
  renewal_hash text,
  code_expires_at timestamptz not null,
  grant_expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index extension_sync_grants_user_idx on public.extension_sync_grants(user_id, grant_expires_at desc);
alter table public.extension_sync_grants enable row level security;

create table public.leaderboard_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  opted_in boolean not null default false,
  display_name text,
  updated_at timestamptz not null default now(),
  constraint leaderboard_display_name_length check (display_name is null or char_length(display_name) between 2 and 32)
);
alter table public.leaderboard_preferences enable row level security;

create or replace function public.create_extension_sync_code()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  current_user_id uuid := auth.uid();
  code text := encode(extensions.gen_random_bytes(32), 'hex');
  code_expires timestamptz := now() + interval '5 minutes';
  grant_expires timestamptz := now() + interval '30 days';
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profile_compliance compliance join public.profiles profile on profile.id = compliance.user_id
    where compliance.user_id = current_user_id and compliance.age_gate_passed_at is not null
      and compliance.privacy_consented_at is not null and profile.account_status = 'active'
  ) then raise exception 'Current account is not eligible for extension sync'; end if;
  update public.extension_sync_grants set revoked_at = now() where user_id = current_user_id and revoked_at is null;
  insert into public.extension_sync_grants (user_id, code_hash, code_expires_at, grant_expires_at)
  values (current_user_id, encode(extensions.digest(code, 'sha256'), 'hex'), code_expires, grant_expires);
  return jsonb_build_object('code', code, 'codeExpiresAt', code_expires, 'grantExpiresAt', grant_expires);
end;
$$;

create or replace function public.redeem_extension_sync_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare sync_grant public.extension_sync_grants%rowtype; renewal_secret text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into sync_grant from public.extension_sync_grants
    where code_hash = encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex')
      and consumed_at is null and revoked_at is null and code_expires_at > now() for update;
  if not found then return jsonb_build_object('eligible', false); end if;
  update public.extension_sync_grants set consumed_at = now(), renewal_hash = encode(extensions.digest(renewal_secret, 'sha256'), 'hex') where id = sync_grant.id;
  return jsonb_build_object('eligible', true, 'grantId', sync_grant.id, 'renewalSecret', renewal_secret, 'expiresAt', sync_grant.grant_expires_at);
end;
$$;

create or replace function public.sync_extension_session(
  p_grant_id uuid, p_renewal_secret text, p_session_id uuid, p_started_at timestamptz,
  p_ended_at timestamptz, p_focus_minutes integer, p_score numeric, p_violation_count integer
) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare p_user_id uuid;
begin
  select sync_grant.user_id into p_user_id from public.extension_sync_grants sync_grant join public.profiles profile on profile.id = sync_grant.user_id
    join public.profile_compliance compliance on compliance.user_id = sync_grant.user_id
    where sync_grant.id = p_grant_id and sync_grant.renewal_hash = encode(extensions.digest(coalesce(p_renewal_secret, ''), 'sha256'), 'hex')
      and sync_grant.consumed_at is not null and sync_grant.revoked_at is null and sync_grant.grant_expires_at > now()
      and profile.account_status = 'active' and compliance.privacy_consented_at is not null;
  if p_user_id is null then return false; end if;
  if p_session_id is null or p_started_at is null or p_ended_at is null or p_ended_at < p_started_at
    or p_started_at > now() + interval '5 minutes' or p_started_at < now() - interval '100 days'
    or p_focus_minutes < 0 or p_focus_minutes > 720 or p_score < 0 or p_score > 100 or p_violation_count < 0 or p_violation_count > 1000
  then return false; end if;
  insert into public.sessions (id, user_id, started_at, ended_at, focus_minutes, score, violation_count)
  values (p_session_id, p_user_id, p_started_at, p_ended_at, p_focus_minutes, p_score, p_violation_count)
  on conflict (id) do nothing;
  return true;
end;
$$;

create or replace function public.set_leaderboard_opt_in(p_opted_in boolean, p_display_name text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare clean_name text := nullif(trim(coalesce(p_display_name, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if clean_name is not null and (char_length(clean_name) < 2 or char_length(clean_name) > 32) then raise exception 'Display name must be 2 to 32 characters'; end if;
  insert into public.leaderboard_preferences (user_id, opted_in, display_name)
  values (auth.uid(), p_opted_in, clean_name)
  on conflict (user_id) do update set opted_in = excluded.opted_in, display_name = excluded.display_name, updated_at = now();
  return true;
end;
$$;

create or replace function public.get_leaderboard()
returns table(rank bigint, display_name text, focused_minutes bigint)
language sql stable security definer set search_path = public as $$
  with totals as (
    select preference.user_id, coalesce(preference.display_name, 'Anonymous learner') as participant,
      coalesce(sum(session.focus_minutes), 0)::bigint as minutes
    from public.leaderboard_preferences preference
    left join public.sessions session on session.user_id = preference.user_id and session.started_at >= now() - interval '30 days'
    where preference.opted_in = true group by preference.user_id, preference.display_name
  ) select rank() over (order by minutes desc), participant, minutes from totals order by minutes desc, participant asc limit 50;
$$;

revoke all on function public.create_extension_sync_code() from public;
revoke all on function public.redeem_extension_sync_code(text) from public;
revoke all on function public.sync_extension_session(uuid, text, uuid, timestamptz, timestamptz, integer, numeric, integer) from public;
revoke all on function public.set_leaderboard_opt_in(boolean, text) from public;
revoke all on function public.get_leaderboard() from public;
grant execute on function public.create_extension_sync_code() to authenticated;
grant execute on function public.redeem_extension_sync_code(text) to anon, authenticated;
grant execute on function public.sync_extension_session(uuid, text, uuid, timestamptz, timestamptz, integer, numeric, integer) to anon, authenticated;
grant execute on function public.set_leaderboard_opt_in(boolean, text) to authenticated;
grant execute on function public.get_leaderboard() to anon, authenticated;
