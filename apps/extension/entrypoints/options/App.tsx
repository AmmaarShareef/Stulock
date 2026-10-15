import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { destroyLocalBiometricData } from "../../src/privacy/local-data";
import "../popup/style.css";

type CameraStatus = { grantEligible: boolean; status: { state: string; reason?: string; meanInferenceMs?: number } };
type SyncStatus = { linked: boolean; expiresAt: string | null };
const cameraSetupUrl = new URL("/cam", import.meta.env.WXT_PUBLIC_STULOCK_WEB_ORIGIN ?? "http://localhost:3000").toString();

export function App() {
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [phoneOffer, setPhoneOffer] = useState("");
  const [phoneAnswer, setPhoneAnswer] = useState("");
  const [camera, setCamera] = useState<CameraStatus>({ grantEligible: false, status: { state: "idle" } });
  const [syncCode, setSyncCode] = useState("");
  const [sync, setSync] = useState<SyncStatus>({ linked: false, expiresAt: null });
  const loadCamera = async () => setCamera(await browser.runtime.sendMessage({ type: "phase3:get-camera-status" }) as CameraStatus);
  const loadSync = async () => setSync(await browser.runtime.sendMessage({ type: "phase4:get-sync-status" }) as SyncStatus);
  useEffect(() => { void loadCamera(); void loadSync(); }, []);

  async function redeem(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const result = await browser.runtime.sendMessage({ type: "phase3:redeem-camera-code", code }) as { ok: boolean };
    setMessage(result.ok ? "Consent verified locally. You may now choose to start the camera." : "That setup code is invalid or expired. Generate another one on the StuLock site.");
    if (result.ok) setCode("");
    await loadCamera();
  }
  async function startCamera() {
    const result = await browser.runtime.sendMessage({ type: "phase3:start-local-vision" }) as { ok: boolean };
    setMessage(result.ok ? "Requesting your browser camera permission now. Processing stays on this device." : "Camera did not start. Confirm your code is still valid and browser permission is allowed.");
    await loadCamera();
  }
  async function stopCamera() { await browser.runtime.sendMessage({ type: "phase3:stop-local-vision" }); setMessage("Local camera processing stopped and the camera stream was closed."); await loadCamera(); }
  async function createPhoneOffer() {
    const result = await browser.runtime.sendMessage({ type: "phase3:create-phone-offer" }) as { ok: boolean; offer?: string };
    if (result.ok && result.offer) { setPhoneOffer(result.offer); setMessage("Phone offer created. Open /cam on the phone, paste it there, then copy its answer back here."); }
    else setMessage("Could not create a phone offer. Verify your camera consent first.");
  }
  async function acceptPhoneAnswer() {
    const result = await browser.runtime.sendMessage({ type: "phase3:accept-phone-answer", answer: phoneAnswer }) as { ok: boolean };
    setMessage(result.ok ? "Phone pairing accepted. Waiting for the local camera stream." : "That phone answer is invalid or has expired.");
    if (result.ok) setPhoneAnswer("");
  }
  async function destroy() { await destroyLocalBiometricData(); setMessage("Local biometric key, camera grant, and encrypted template have been destroyed."); await loadCamera(); }
  async function redeemSync(event: React.FormEvent) { event.preventDefault(); const result = await browser.runtime.sendMessage({ type: "phase4:redeem-sync-code", code: syncCode }) as { ok: boolean }; setMessage(result.ok ? "Aggregate sync enabled. Only completed-session totals can be sent." : "That account-link code is invalid or expired."); if (result.ok) setSyncCode(""); await loadSync(); }
  async function syncLatest() { const result = await browser.runtime.sendMessage({ type: "phase4:sync-latest-report" }) as { ok: boolean }; setMessage(result.ok ? "Your latest completed-session totals were synced." : "There is no completed report to sync yet, or the link has expired."); }

  return <main className="popup"><p className="eyebrow">Privacy & settings</p><h1>You control the camera.</h1><p className="intro">Camera processing is optional. Frames remain in the extension’s protected offscreen document; only derived presence, writing, phone, and fatigue signals are retained locally.</p><section className="camera-settings"><h2>Local camera processing</h2><p className="privacy">1. Sign in on the StuLock site. 2. Generate a one-time code. 3. Paste it here. The extension rechecks active consent every minute while the camera is on.</p><a className="setup-link" href={cameraSetupUrl} target="_blank" rel="noreferrer">Open secure camera setup</a><form onSubmit={redeem}><label>One-time setup code<input value={code} onChange={(event) => setCode(event.target.value)} minLength={32} required placeholder="Paste the code from /cam" /></label><button>Verify code</button></form><p className="privacy">Eligibility: <strong>{camera.grantEligible ? "verified" : "not verified"}</strong> · Camera: <strong>{camera.status.state}</strong>{camera.status.reason ? ` — ${camera.status.reason}` : ""}</p>{camera.status.state === "running" || camera.status.state === "degraded" || camera.status.state === "paused" ? <button className="danger" onClick={() => void stopCamera()}>Stop local camera</button> : <button disabled={!camera.grantEligible} onClick={() => void startCamera()}>Start local camera</button>}</section><section className="camera-settings"><h2>Optional phone camera</h2><p className="privacy">Pair directly on the same Wi-Fi with a five-minute offer. No signaling service or relay is used.</p><button disabled={!camera.grantEligible} onClick={() => void createPhoneOffer()}>Create phone offer</button>{phoneOffer && <><label>Offer — copy this to the signed-in phone page<textarea readOnly value={phoneOffer} /></label><label>Phone answer<input value={phoneAnswer} onChange={(event) => setPhoneAnswer(event.target.value)} placeholder="Paste the answer from /cam" /></label><button disabled={!phoneAnswer} onClick={() => void acceptPhoneAnswer()}>Accept phone answer</button></>}</section><section className="camera-settings"><h2>Optional account sync</h2><p className="privacy">Generate an account-link code from your StuLock dashboard. Sync sends only completed-session dates, focused minutes, score, and intervention count — never task text, page addresses, policy history, camera data, or browsing history.</p><form onSubmit={redeemSync}><label>Account-link code<input value={syncCode} onChange={(event) => setSyncCode(event.target.value)} minLength={32} required placeholder="Paste the code from your dashboard" /></label><button>Enable aggregate sync</button></form><p className="privacy">Status: <strong>{sync.linked ? `linked until ${sync.expiresAt ? new Date(sync.expiresAt).toLocaleDateString() : "expiry"}` : "local only"}</strong></p><button className="secondary" disabled={!sync.linked} onClick={() => void syncLatest()}>Sync latest completed report</button></section><button onClick={() => void destroy()}>Destroy local biometric data</button>{message && <p className="message">{message}</p>}<p className="privacy">Destruction cannot be undone. It removes the local encryption key and camera authorization, making the encrypted template unreadable. Withdrawal on the website blocks the next extension consent check.</p></main>;
}
