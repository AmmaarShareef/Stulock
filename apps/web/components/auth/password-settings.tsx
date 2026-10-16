"use client";

import { useState } from "react";
import { passwordValidationMessage, validatePassword } from "@/lib/auth/password";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function PasswordSettings({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const validation = validatePassword(password);
    if (!validation.ok) {
      setMessage(passwordValidationMessage(validation) ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    const attributes = currentPassword ? { password, current_password: currentPassword } : { password };
    const { error } = await createSupabaseBrowserClient().auth.updateUser(attributes);
    setBusy(false);
    if (error) {
      setMessage("We could not save your password. If you are changing one, check your current password and try again.");
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirmation("");
    setMessage(`Password saved for ${email}. You can now use password sign-in.`);
  }

  return <section className="account-security">
    <div><p className="eyebrow">Account security</p><h2>Add or change your password</h2><p>Use a password for quick sign-in instead of a one-time email link. If you are changing an existing password, include it below for an extra check.</p></div>
    <form className="password-settings-form" onSubmit={submit}>
      <label>Current password <span>optional when adding your first one</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
      <label>New password<input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="12+ characters, upper/lowercase and number" /></label>
      <label>Confirm new password<input type="password" required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <button className="button" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
      {message && <p className="form-message" role="status">{message}</p>}
    </form>
  </section>;
}
