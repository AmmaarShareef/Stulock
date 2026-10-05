"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export function LoginForm() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const supabase = createSupabaseBrowserClient(); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` } }); setMessage(error ? "We could not send that sign-in link. Please try again." : "If this address can sign in, a secure link is on its way."); } catch { setMessage("We could not send that sign-in link. Please try again."); } finally { setBusy(false); } }
  return <form className="login-form" onSubmit={submit}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button className="button" disabled={busy}>{busy ? "Sending…" : "Send secure sign-in link"}</button>{message && <p className="form-message">{message}</p>}</form>;
}
