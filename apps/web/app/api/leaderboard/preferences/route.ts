import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { optedIn?: unknown; displayName?: unknown } | null;
  if (!body || typeof body.optedIn !== "boolean" || (body.displayName !== undefined && typeof body.displayName !== "string")) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase!.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { error } = await supabase!.rpc("set_leaderboard_opt_in", { p_opted_in: body.optedIn, p_display_name: typeof body.displayName === "string" ? body.displayName : null });
  return error ? NextResponse.json({ error: "unable_to_save" }, { status: 400 }) : NextResponse.json({ ok: true });
}
