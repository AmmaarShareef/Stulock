"use client";

import { useState } from "react";
import { passwordValidationMessage, validatePassword } from "@/lib/auth/password";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "password" | "signup" | "email";

const copy: Record<AuthMode, { title: string; action: string }> = {
  password: { title: "Use your email and password to continue.", action: "Sign in" },
  signup: { title: "Create a password for faster sign-ins after you verify your email.", action: "Create account" },
  email: { title: "Send a one-time link if you prefer not to use a password.", action: "Send secure sign-in link" },
};

export function EmailLoginForm() {
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function chooseMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmation("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (mode !== "email") {
      const validation = validatePassword(password);
      if (!validation.ok) {
        setMessage(passwordValidationMessage(validation) ?? "Choose a stronger password.");
        return;
      }
      if (mode === "signup" && password !== confirmation) {
        setMessage("The passwords do not match.");
        return;
      }
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage("We could not sign you in with those details. Try an email link if this account has no password yet.");
        else window.location.assign("/dashboard");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
        });
        if (error) setMessage("We could not create that account. Please try again.");
        else if (data.session) window.location.assign("/onboarding");
        else setMessage("Check your inbox to verify your email, then you can finish setting up StuLock.");
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`, shouldCreateUser: false },
      });
      setMessage(error ? "We could not send a sign-in link. Please try again." : "If this email can sign in, a secure link is on its way.");
    } catch {
      setMessage("We could not complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="login-form" onSubmit={submit}>
    <div className="auth-mode-tabs" role="tablist" aria-label="Sign-in method">
      <button type="button" role="tab" aria-selected={mode === "password"} className={mode === "password" ? "active" : ""} onClick={() => chooseMode("password")}>Password</button>
      <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => chooseMode("signup")}>Create account</button>
      <button type="button" role="tab" aria-selected={mode === "email"} className={mode === "email" ? "active" : ""} onClick={() => chooseMode("email")}>Email link</button>
    </div>
    <p className="auth-mode-copy">{copy[mode].title}</p>
    <label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
    {mode !== "email" && <label>Password<input type="password" required minLength={12} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /></label>}
    {mode === "signup" && <label>Confirm password<input type="password" required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>}
    <button className="button" disabled={busy}>{busy ? "Working…" : copy[mode].action}</button>
    {message && <p className="form-message" role="status">{message}</p>}
    {mode === "password" && <button className="auth-link-button" type="button" onClick={() => chooseMode("email")}>Use an email link instead</button>}
  </form>;
}
