-- RLS intentionally keeps preferences table-private. This function exposes only
-- the current account's two display settings to its own dashboard.
create or replace function public.get_my_leaderboard_preference()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('optedIn', opted_in, 'displayName', display_name)
    from public.leaderboard_preferences where user_id = auth.uid()), jsonb_build_object('optedIn', false, 'displayName', ''));
$$;
revoke all on function public.get_my_leaderboard_preference() from public;
grant execute on function public.get_my_leaderboard_preference() to authenticated;
