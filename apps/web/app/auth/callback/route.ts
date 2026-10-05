import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next");
  const destination = next?.startsWith("/") ? next : "/admin";
  const response = NextResponse.redirect(new URL(destination, url.origin));
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (code && projectUrl && anonKey) {
    const supabase = createServerClient(projectUrl, anonKey, { cookies: {
      getAll: () => request.headers.get("cookie")?.split("; ").map((value) => { const index = value.indexOf("="); return { name: value.slice(0, index), value: value.slice(index + 1) }; }) ?? [],
      setAll: (items) => items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    } });
    await supabase.auth.exchangeCodeForSession(code);
  }
  return response;
}
