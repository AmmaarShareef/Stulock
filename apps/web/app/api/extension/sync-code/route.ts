import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase!.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data, error } = await supabase!.rpc("create_extension_sync_code");
  if (error || !data) return NextResponse.json({ error: "ineligible" }, { status: 403 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
