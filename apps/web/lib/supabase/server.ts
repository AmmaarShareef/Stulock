import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured() { return config() !== null; }

export async function createSupabaseServerClient() {
  const values = config();
  if (!values) return null;
  const store = await cookies();
  return createServerClient(values.url, values.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => { try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Components cannot set cookies. */ } },
    },
  });
}

export function createSupabaseAdminClient() {
  const values = config();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!values || !serviceKey) return null;
  return createClient(values.url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
