"use client";
import { useState } from "react";

export function AccountDeletionRequest() {
  const [message, setMessage] = useState("");
  async function requestDeletion() { if (!window.confirm("Request permanent account deletion? This cannot be undone after fulfilment.")) return; const response = await fetch("/api/account/deletion-request", { method: "POST" }); setMessage(response.ok ? "Deletion request recorded. Support will complete it after identity/account review." : "We could not record the deletion request. Please try again."); }
  return <section className="withdraw"><h2>Request account deletion</h2><p>This creates a private deletion request for your account and all synced aggregates. Your extension’s local data remains under your control and can be destroyed in its Privacy settings.</p><button className="danger-button" onClick={() => void requestDeletion()}>Request permanent deletion</button>{message && <p className="form-message">{message}</p>}</section>;
}
