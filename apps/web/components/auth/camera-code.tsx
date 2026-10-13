"use client";

import { useState } from "react";

type CameraCode = { code: string; codeExpiresAt: string; grantExpiresAt: string };

export function CameraCode() {
  const [result, setResult] = useState<CameraCode | null>(null);
  const [message, setMessage] = useState("");
  async function createCode() {
    setMessage("");
    const response = await fetch("/api/extension/camera-code", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.code !== "string") { setMessage("We could not create a camera setup code. Check that your consent is still active."); return; }
    setResult(body as CameraCode);
  }
  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.code);
    setMessage("Code copied. Paste it into the StuLock extension within five minutes.");
  }
  return <section className="withdraw"><h2>Connect the local camera</h2><p>Generate a one-time setup code, then paste it into the extension. This proves your existing consent to the extension without giving it your web login. The code expires in five minutes.</p><button onClick={() => void createCode()}>Generate one-time code</button>{result && <><code className="camera-code">{result.code}</code><button className="secondary-button" onClick={() => void copy()}>Copy code</button></>} {message && <p className="form-message">{message}</p>}</section>;
}
