import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AuthenticatedUser = { id: string; email: string };
export async function requireUser(): Promise<AuthenticatedUser> {
  if (!isSupabaseConfigured()) redirect("/login?reason=setup");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?reason=setup");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { id: user.id, email: user.email ?? "" };
}

export async function requireOnboardedUser(): Promise<AuthenticatedUser> {
  const user = await requireUser(); const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase!.rpc("is_onboarding_complete");
  if (error || data !== true) redirect("/onboarding");
  return user;
}
