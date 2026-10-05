import { createSupabaseAdminClient } from "@/lib/supabase/server";
type Row = Record<string, unknown>;
const asNumber = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);
export type AdminOverview = { totalUsers: number; newUsersThisWeek: number; activeSubscriptions: number; completedSessions: number; averageScore: number; flaggedSessions: number };

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const admin = createSupabaseAdminClient(); if (!admin) return null;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [users, newUsers, subscriptions, sessions, scores, flags] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }), admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]), admin.from("sessions").select("id", { count: "exact", head: true }).not("ended_at", "is", null),
    admin.from("sessions").select("score").not("score", "is", null), admin.from("session_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const values = (scores.data ?? []) as Row[];
  return { totalUsers: users.count ?? 0, newUsersThisWeek: newUsers.count ?? 0, activeSubscriptions: subscriptions.count ?? 0, completedSessions: sessions.count ?? 0, averageScore: values.length ? Math.round(values.reduce((sum, row) => sum + asNumber(row.score), 0) / values.length) : 0, flaggedSessions: flags.count ?? 0 };
}
export async function getRecentUsers(limit = 20) { const admin = createSupabaseAdminClient(); if (!admin) return [] as Row[]; const { data } = await admin.from("profiles").select("id, email, full_name, created_at, last_sign_in_at, account_status, subscriptions(status, plan)").order("created_at", { ascending: false }).limit(limit); return (data ?? []) as Row[]; }
export async function getAdminStaff() { const admin = createSupabaseAdminClient(); if (!admin) return [] as Row[]; const { data } = await admin.from("admin_users").select("user_id, role, is_active, granted_at, profiles(email, full_name)").order("granted_at", { ascending: false }); return (data ?? []) as Row[]; }
export async function getRecentSessions(limit = 20) { const admin = createSupabaseAdminClient(); if (!admin) return [] as Row[]; const { data } = await admin.from("sessions").select("id, started_at, ended_at, score, focus_minutes, violation_count, profiles(email, full_name)").order("started_at", { ascending: false }).limit(limit); return (data ?? []) as Row[]; }
export async function getOpenFlags(limit = 20) { const admin = createSupabaseAdminClient(); if (!admin) return [] as Row[]; const { data } = await admin.from("session_flags").select("id, category, severity, created_at, status, note, sessions(id, profiles(email, full_name))").eq("status", "open").order("created_at", { ascending: false }).limit(limit); return (data ?? []) as Row[]; }
export async function getAuditLog(limit = 50) { const admin = createSupabaseAdminClient(); if (!admin) return [] as Row[]; const { data } = await admin.from("admin_audit_log").select("id, action, target_type, target_id, metadata, created_at, profiles!admin_audit_log_actor_id_fkey(email, full_name)").order("created_at", { ascending: false }).limit(limit); return (data ?? []) as Row[]; }
