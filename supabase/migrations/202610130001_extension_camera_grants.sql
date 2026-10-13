-- Phase 3: an extension proves the account's existing consent without receiving a
-- Supabase session cookie, user identity, raw camera data, or any biometric record.
create extension if not exists pgcrypto with schema extensions;

create table public.extension_camera_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null unique,
  renewal_hash text,
  code_expires_at timestamptz not null,
  grant_expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index extension_camera_grants_user_idx on public.extension_camera_grants(user_id, grant_expires_at desc);
alter table public.extension_camera_grants enable row level security;
-- No policies: grants are available only through the narrowly scoped functions below.

create or replace function public.create_extension_camera_code()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  code text := encode(extensions.gen_random_bytes(32), 'hex');
  code_expires timestamptz := now() + interval '5 minutes';
  grant_expires timestamptz := now() + interval '1 hour';
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profile_compliance compliance
    join public.profiles profile on profile.id = compliance.user_id
    where compliance.user_id = current_user_id
      and compliance.age_gate_passed_at is not null
      and compliance.privacy_consented_at is not null
      and compliance.biometric_consented_at is not null
      and profile.account_status = 'active'
  ) then raise exception 'Current account is not eligible for camera processing'; end if;

  insert into public.extension_camera_grants (user_id, code_hash, code_expires_at, grant_expires_at)
  values (current_user_id, encode(extensions.digest(code, 'sha256'), 'hex'), code_expires, grant_expires);
  return jsonb_build_object('code', code, 'codeExpiresAt', code_expires, 'grantExpiresAt', grant_expires);
end;
$$;

create or replace function public.redeem_extension_camera_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  camera_grant public.extension_camera_grants%rowtype;
  renewal_secret text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into camera_grant from public.extension_camera_grants
    where code_hash = encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex')
      and consumed_at is null and code_expires_at > now()
    for update;
  if not found then return jsonb_build_object('eligible', false); end if;

  update public.extension_camera_grants
    set consumed_at = now(), renewal_hash = encode(extensions.digest(renewal_secret, 'sha256'), 'hex')
    where id = camera_grant.id;
  return jsonb_build_object('eligible', true, 'grantId', camera_grant.id, 'renewalSecret', renewal_secret, 'expiresAt', camera_grant.grant_expires_at);
end;
$$;

create or replace function public.verify_extension_camera_grant(p_grant_id uuid, p_renewal_secret text)
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object('eligible', exists (
    select 1 from public.extension_camera_grants camera_grant
    join public.profile_compliance compliance on compliance.user_id = camera_grant.user_id
    join public.profiles profile on profile.id = camera_grant.user_id
    where camera_grant.id = p_grant_id
      and camera_grant.renewal_hash = encode(extensions.digest(coalesce(p_renewal_secret, ''), 'sha256'), 'hex')
      and camera_grant.consumed_at is not null
      and camera_grant.grant_expires_at > now()
      and compliance.age_gate_passed_at is not null
      and compliance.privacy_consented_at is not null
      and compliance.biometric_consented_at is not null
      and profile.account_status = 'active'
  ));
$$;

revoke all on function public.create_extension_camera_code() from public;
revoke all on function public.redeem_extension_camera_code(text) from public;
revoke all on function public.verify_extension_camera_grant(uuid, text) from public;
grant execute on function public.create_extension_camera_code() to authenticated;
grant execute on function public.redeem_extension_camera_code(text) to anon, authenticated;
grant execute on function public.verify_extension_camera_grant(uuid, text) to anon, authenticated;
