"use client";
import { useState } from "react";

type LinkCode = { code: string; codeExpiresAt: string; grantExpiresAt: string };
export function ExtensionSyncCode() {
  const [result, setResult] = useState<LinkCode | null>(null); const [message, setMessage] = useState("");
  async function createCode() { const response = await fetch("/api/extension/sync-code", { method: "POST" }); const body = await response.json().catch(() => ({})); if (!response.ok || typeof body.code !== "string") { setMessage("We could not create an account-link code. Please sign in again."); return; } setResult(body as LinkCode); setMessage("Paste this into Extension settings within five minutes."); }
  async function copy() { if (!result) return; await navigator.clipboard.writeText(result.code); setMessage("Code copied. The extension receives no web login cookie."); }
  return <section className="withdraw"><h2>Optional extension sync</h2><p>Connect your extension with a one-time code. It may sync only completed-session dates, focused minutes, score, and intervention count. It never receives your web login, and it never uploads task text, page addresses, policy history, camera data, or browsing history.</p><button className="button" onClick={() => void createCode()}>Generate account-link code</button>{result && <><code className="camera-code">{result.code}</code><button className="secondary-button" onClick={() => void copy()}>Copy code</button></>}{message && <p className="form-message">{message}</p>}</section>;
}
