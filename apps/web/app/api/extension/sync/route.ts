import { NextResponse } from "next/server";
import { validateAggregateSession } from "@/lib/extension-sync";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type SyncBody = { action?: unknown; code?: unknown; grantId?: unknown; renewalSecret?: unknown; aggregate?: unknown };
const noStore = { headers: { "Cache-Control": "no-store" } };
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503, ...noStore });
  const body = await request.json().catch(() => ({})) as SyncBody; const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503, ...noStore });
  if (body.action === "redeem" && typeof body.code === "string") {
    const { data } = await supabase.rpc("redeem_extension_sync_code", { p_code: body.code });
    return NextResponse.json(data ?? { eligible: false }, noStore);
  }
  if (body.action === "sync" && typeof body.grantId === "string" && typeof body.renewalSecret === "string") {
    const aggregate = validateAggregateSession(body.aggregate); if (!aggregate.ok) return NextResponse.json(aggregate, { status: 400, ...noStore });
    const { data } = await supabase.rpc("sync_extension_session", { p_grant_id: body.grantId, p_renewal_secret: body.renewalSecret, p_session_id: aggregate.value.sessionId, p_started_at: aggregate.value.startedAt, p_ended_at: aggregate.value.endedAt, p_focus_minutes: aggregate.value.focusMinutes, p_score: aggregate.value.score, p_violation_count: aggregate.value.violationCount });
    return NextResponse.json({ ok: data === true }, noStore);
  }
  return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400, ...noStore });
}
