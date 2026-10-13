import { browser } from "wxt/browser";
import { PhonePairPeer } from "../../src/pairing/peer";
import { LocalVisionRuntime, type LocalVisionStatus } from "../../src/vision/runtime";

const runtime = new LocalVisionRuntime();
let phonePair: PhonePairPeer | null = null;

browser.runtime.onMessage.addListener((message: { type?: string; answer?: string }) => {
  if (message.type === "phase3:offscreen-start") return runtime.start(publishStatus);
  if (message.type === "phase3:offscreen-phone-offer") {
    phonePair = new PhonePairPeer((stream) => void runtime.startWithStream(stream, publishStatus));
    return phonePair.createOffer().then((offer) => ({ ok: true, offer })).catch((error: unknown) => ({ ok: false, reason: error instanceof Error ? error.message : "pairing_failed" }));
  }
  if (message.type === "phase3:offscreen-phone-answer") return phonePair?.acceptAnswer(message.answer ?? "") ?? Promise.resolve({ ok: false, reason: "missing_offer" });
  if (message.type === "phase3:offscreen-stop") { runtime.stop(); phonePair?.close(); phonePair = null; return Promise.resolve({ ok: true }); }
  return undefined;
});

function publishStatus(status: LocalVisionStatus): void {
  // This message carries no frames, landmarks, face template, page content, or URL.
  void browser.runtime.sendMessage({ type: "phase3:vision-status", status });
}
