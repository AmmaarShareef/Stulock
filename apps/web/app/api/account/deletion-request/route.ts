import { NextResponse } from "next/server";
import { hasTrustedMutationOrigin } from "@/lib/request-security";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase!.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { error } = await supabase!.rpc("request_account_deletion");
  return error ? NextResponse.json({ error: "unable_to_request" }, { status: 400 }) : NextResponse.json({ ok: true });
}
