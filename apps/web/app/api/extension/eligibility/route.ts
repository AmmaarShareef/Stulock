import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type RequestBody = { action?: unknown; code?: unknown; grantId?: unknown; renewalSecret?: unknown };
const noStore = { headers: { "Cache-Control": "no-store" } };

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ eligible: false }, { status: 503, ...noStore });
  const body = await request.json().catch(() => ({})) as RequestBody;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ eligible: false }, { status: 503, ...noStore });
  if (body.action === "redeem" && typeof body.code === "string") {
    const { data } = await supabase.rpc("redeem_extension_camera_code", { p_code: body.code });
    return NextResponse.json(data ?? { eligible: false }, noStore);
  }
  if (body.action === "verify" && typeof body.grantId === "string" && typeof body.renewalSecret === "string") {
    const { data } = await supabase.rpc("verify_extension_camera_grant", { p_grant_id: body.grantId, p_renewal_secret: body.renewalSecret });
    return NextResponse.json(data ?? { eligible: false }, noStore);
  }
  return NextResponse.json({ eligible: false }, { status: 400, ...noStore });
}
