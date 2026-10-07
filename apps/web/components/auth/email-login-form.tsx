"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export function EmailLoginForm() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`, shouldCreateUser: true } }); setMessage(error ? "We could not send a sign-in link. Please try again." : "If this email can sign in, a secure link is on its way."); } catch { setMessage("We could not send a sign-in link. Please try again."); } finally { setBusy(false); } }
  return <form className="login-form" onSubmit={submit}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><button className="button" disabled={busy}>{busy ? "Sending…" : "Send secure sign-in link"}</button>{message && <p className="form-message">{message}</p>}</form>;
}
