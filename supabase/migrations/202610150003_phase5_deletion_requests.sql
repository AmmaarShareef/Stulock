-- Phase 5: users can request deletion without granting a browser direct access
-- to account-administration data. Fulfilment is an auditable support operation.
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null
);
alter table public.account_deletion_requests enable row level security;

create or replace function public.request_account_deletion()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.account_deletion_requests (user_id) values (auth.uid())
  on conflict (user_id) do update set status = 'pending', requested_at = now(), completed_at = null, completed_by = null;
  return true;
end;
$$;
revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;
