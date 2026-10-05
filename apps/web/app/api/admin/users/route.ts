import { NextResponse } from "next/server";
import { requireAdmin, ADMIN_ROLES, type AdminRole } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
const json = (error: string, status = 400) => NextResponse.json({ error }, { status });
export async function POST(request: Request) {
  const actor = await requireAdmin("admin"); const body = await request.json().catch(() => null) as Record<string, unknown> | null; if (!body) return json("Invalid request.");
  const service = createSupabaseAdminClient(); if (!service) return json("Admin service is not configured.", 503);
  if (body.action === "invite") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""; const role = body.role as AdminRole;
    if (!/^\S+@\S+\.\S+$/.test(email) || !ADMIN_ROLES.includes(role)) return json("Provide a valid email and role.");
    if (role === "owner" && actor.role !== "owner") return json("Only an owner can appoint an owner.", 403);
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, { redirectTo: `${new URL(request.url).origin}/auth/callback?next=/admin` });
    if (error || !data.user) return json("Invitation could not be sent.");
    await service.from("admin_users").upsert({ user_id: data.user.id, role, is_active: true, granted_by: actor.id });
    await service.from("admin_audit_log").insert({ actor_id: actor.id, action: "admin_invited", target_type: "admin_user", target_id: data.user.id, metadata: { role, email } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "toggle_suspension") {
    const userId = typeof body.userId === "string" ? body.userId : ""; const suspended = body.suspended === true; if (!userId || userId === actor.id) return json("You cannot change your own account status.");
    const { data: targetMembership } = await service.from("admin_users").select("role, is_active").eq("user_id", userId).maybeSingle();
    if (suspended && targetMembership?.role === "owner" && targetMembership.is_active) return json("An active owner cannot be suspended.", 403);
    const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: suspended ? "876000h" : "none" }); if (error) return json("Account state could not be updated.");
    await service.from("profiles").update({ account_status: suspended ? "suspended" : "active" }).eq("id", userId);
    await service.from("admin_audit_log").insert({ actor_id: actor.id, action: suspended ? "account_suspended" : "account_reinstated", target_type: "profile", target_id: userId });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "revoke_admin") {
    if (actor.role !== "owner") return json("Only an owner can revoke administrator access.", 403);
    const userId = typeof body.userId === "string" ? body.userId : ""; if (!userId || userId === actor.id) return json("You cannot revoke your own access.");
    const { data: target } = await service.from("admin_users").select("role").eq("user_id", userId).maybeSingle();
    if (!target || target.role === "owner") return json("Owner access cannot be revoked here.", 403);
    await service.from("admin_users").update({ is_active: false }).eq("user_id", userId);
    await service.from("admin_audit_log").insert({ actor_id: actor.id, action: "admin_access_revoked", target_type: "admin_user", target_id: userId });
    return NextResponse.json({ ok: true });
  }
  return json("Unknown action.");
}
