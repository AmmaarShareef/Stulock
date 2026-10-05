import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const ADMIN_ROLES = ["owner", "admin", "analyst", "support"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
const rank: Record<AdminRole, number> = { support: 1, analyst: 2, admin: 3, owner: 4 };
export type AdminIdentity = { id: string; email: string; role: AdminRole; name: string | null };

export async function requireAdmin(minimum: AdminRole = "support"): Promise<AdminIdentity> {
  if (!isSupabaseConfigured()) redirect("/admin/login?reason=setup");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/admin/login?reason=setup");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  let { data } = await supabase.from("admin_users").select("role, is_active, profiles(full_name)").eq("user_id", user.id).maybeSingle();
  // A deliberate, one-time recovery hatch: it creates an owner only when no owner exists.
  // It is controlled by a server-only allowlist and never makes a public signup an admin.
  if (!data && process.env.ADMIN_BOOTSTRAP_EMAILS?.split(",").map((email) => email.trim().toLowerCase()).includes((user.email ?? "").toLowerCase())) {
    const service = createSupabaseAdminClient();
    if (service) {
      const { count } = await service.from("admin_users").select("user_id", { count: "exact", head: true }).eq("role", "owner").eq("is_active", true);
      if (count === 0) {
        await service.from("admin_users").upsert({ user_id: user.id, role: "owner", is_active: true });
        await service.from("admin_audit_log").insert({ actor_id: user.id, action: "owner_bootstrapped", target_type: "admin_user", target_id: user.id });
        ({ data } = await supabase.from("admin_users").select("role, is_active, profiles(full_name)").eq("user_id", user.id).maybeSingle());
      }
    }
  }
  const membership = data as { role: AdminRole; is_active: boolean; profiles: { full_name: string | null } | null } | null;
  if (!membership?.is_active || !ADMIN_ROLES.includes(membership.role) || rank[membership.role] < rank[minimum]) redirect("/admin/denied");
  return { id: user.id, email: user.email ?? "", role: membership.role, name: membership.profiles?.full_name ?? null };
}
