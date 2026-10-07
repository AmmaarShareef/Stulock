-- Phase 1: compliance facts live behind security-definer RPCs, not in mutable
-- browser-controlled profile fields. This is a development migration; review it
-- before applying to a production project.

create table public.profile_compliance (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null,
  age_gate_passed_at timestamptz not null,
  privacy_policy_version text not null,
  privacy_consented_at timestamptz not null,
  biometric_consent_version text,
  biometric_consented_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_type text not null check (policy_type in ('privacy', 'biometric')),
  policy_version text not null,
  accepted boolean not null,
  created_at timestamptz not null default now()
);

alter table public.profile_compliance enable row level security;
alter table public.consent_events enable row level security;

-- No direct policies are deliberately created on either table. The only public
-- surface is the narrowly scoped functions below; service_role remains for ops.
create or replace function public.complete_onboarding(
  p_birth_date date,
  p_policy_version text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_policy_version <> '2026-10-06' then raise exception 'Consent policy version is not current'; end if;
  if p_birth_date is null or p_birth_date > current_date then raise exception 'Invalid birth date'; end if;
  if p_birth_date > (current_date - interval '13 years')::date then raise exception 'Minimum age requirement not met'; end if;

  insert into public.profile_compliance (
    user_id, birth_date, age_gate_passed_at, privacy_policy_version, privacy_consented_at,
    biometric_consent_version, biometric_consented_at, updated_at
  ) values (
    current_user_id, p_birth_date, now(), p_policy_version, now(), p_policy_version, now(), now()
  ) on conflict (user_id) do update set
    birth_date = excluded.birth_date,
    age_gate_passed_at = excluded.age_gate_passed_at,
    privacy_policy_version = excluded.privacy_policy_version,
    privacy_consented_at = excluded.privacy_consented_at,
    biometric_consent_version = excluded.biometric_consent_version,
    biometric_consented_at = excluded.biometric_consented_at,
    updated_at = now();

  insert into public.consent_events (user_id, policy_type, policy_version, accepted)
  values (current_user_id, 'privacy', p_policy_version, true), (current_user_id, 'biometric', p_policy_version, true);
  return true;
end;
$$;

create or replace function public.is_onboarding_complete()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_compliance
    where user_id = auth.uid()
      and age_gate_passed_at is not null
      and privacy_consented_at is not null
      and biometric_consented_at is not null
  );
$$;

create or replace function public.withdraw_biometric_consent()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  update public.profile_compliance
    set biometric_consent_version = null, biometric_consented_at = null, updated_at = now()
    where user_id = current_user_id;
  if not found then raise exception 'Onboarding record not found'; end if;
  insert into public.consent_events (user_id, policy_type, policy_version, accepted)
    values (current_user_id, 'biometric', '2026-10-06', false);
  return true;
end;
$$;

revoke all on function public.complete_onboarding(date, text) from public;
revoke all on function public.is_onboarding_complete() from public;
revoke all on function public.withdraw_biometric_consent() from public;
grant execute on function public.complete_onboarding(date, text) to authenticated;
grant execute on function public.is_onboarding_complete() to authenticated;
grant execute on function public.withdraw_biometric_consent() to authenticated;
