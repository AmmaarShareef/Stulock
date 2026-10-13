"use client";

import { decodePhonePairOffer, encodePhonePairAnswer, validatePairingOffer } from "@stulock/core";
import { useEffect, useRef, useState } from "react";

const waitForIceGathering = (connection: RTCPeerConnection) => new Promise<void>((resolve) => {
  if (connection.iceGatheringState === "complete") { resolve(); return; }
  const timer = window.setTimeout(resolve, 4_000);
  connection.addEventListener("icegatheringstatechange", () => { if (connection.iceGatheringState === "complete") { window.clearTimeout(timer); resolve(); } }, { once: true });
});

export function PhonePair() {
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [message, setMessage] = useState("");
  const connection = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => () => { connection.current?.close(); stream.current?.getTracks().forEach((track) => track.stop()); void wakeLock.current?.release(); }, []);

  async function connectPhone() {
    const offer = decodePhonePairOffer(offerText);
    if (!offer || !validatePairingOffer(offer, offer.code).ok) { setMessage("That pairing offer is invalid or expired. The phone camera was not opened."); return; }
    try {
      const peer = new RTCPeerConnection({ iceServers: [] });
      connection.current = peer;
      await peer.setRemoteDescription(offer.description);
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 15 } }, audio: false });
      stream.current = camera;
      camera.getTracks().forEach((track) => peer.addTrack(track, camera));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await waitForIceGathering(peer);
      if (!peer.localDescription?.sdp) throw new Error("No local answer was created.");
      setAnswerText(encodePhonePairAnswer({ version: 1, code: offer.code, description: { type: "answer", sdp: peer.localDescription.sdp } }));
      wakeLock.current = await navigator.wakeLock?.request("screen") ?? null;
      setMessage("Phone camera is live locally. Copy the answer back to the extension to finish pairing.");
    } catch {
      connection.current?.close(); connection.current = null; stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
      setMessage("The phone could not connect. Confirm both devices are on the same local network and camera permission is allowed.");
    }
  }
  async function copyAnswer() { await navigator.clipboard.writeText(answerText); setMessage("Answer copied. Paste it into the extension’s phone-pairing section."); }
  function stop() { connection.current?.close(); connection.current = null; stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; void wakeLock.current?.release(); wakeLock.current = null; setAnswerText(""); setMessage("Phone camera stopped."); }

  return <section className="withdraw"><h2>Use this phone as the camera (optional)</h2><p>This local-network WebRTC option avoids a signaling service, relays, and server-side storage. Generate a phone offer in the extension, paste it here, then copy the answer back. Keep both devices on the same Wi-Fi.</p><label className="pair-label">Phone offer<textarea value={offerText} onChange={(event) => setOfferText(event.target.value)} placeholder="Paste the extension offer" /></label><button className="button" onClick={() => void connectPhone()}>Prepare phone answer</button>{answerText && <><code className="camera-code">{answerText}</code><button className="secondary-button" onClick={() => void copyAnswer()}>Copy answer</button><button className="danger-button" onClick={stop}>Stop phone camera</button></>}{message && <p className="form-message">{message}</p>}</section>;
}
