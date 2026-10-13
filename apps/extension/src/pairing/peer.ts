import { createPairingOffer, decodePhonePairAnswer, encodePhonePairOffer, validatePairingOffer, type PhonePairOffer } from "@stulock/core";

const waitForIceGathering = (connection: RTCPeerConnection) => new Promise<void>((resolve) => {
  if (connection.iceGatheringState === "complete") { resolve(); return; }
  const timer = window.setTimeout(resolve, 4_000);
  connection.addEventListener("icegatheringstatechange", () => {
    if (connection.iceGatheringState === "complete") { window.clearTimeout(timer); resolve(); }
  }, { once: true });
});

/** Local-network-only WebRTC pairing. SDP is exchanged manually, never persisted or relayed. */
export class PhonePairPeer {
  private connection: RTCPeerConnection | null = null;
  private offer: PhonePairOffer | null = null;

  constructor(private readonly onStream: (stream: MediaStream) => void) {}

  async createOffer(): Promise<string> {
    this.close();
    const connection = new RTCPeerConnection({ iceServers: [] });
    this.connection = connection;
    connection.createDataChannel("stulock-pairing");
    connection.addEventListener("track", (event) => { const stream = event.streams[0]; if (stream) this.onStream(stream); });
    const description = await connection.createOffer({ offerToReceiveVideo: true });
    await connection.setLocalDescription(description);
    await waitForIceGathering(connection);
    const local = connection.localDescription;
    if (!local?.sdp) throw new Error("Could not prepare a local phone pairing offer.");
    this.offer = { version: 1, ...createPairingOffer(), description: { type: "offer", sdp: local.sdp } };
    return encodePhonePairOffer(this.offer);
  }

  async acceptAnswer(encodedAnswer: string): Promise<{ ok: boolean; reason?: string }> {
    if (!this.connection || !this.offer) return { ok: false, reason: "missing_offer" };
    const answer = decodePhonePairAnswer(encodedAnswer);
    if (!answer || validatePairingOffer(this.offer, answer.code).ok === false || answer.code !== this.offer.code) return { ok: false, reason: "invalid_or_expired_answer" };
    await this.connection.setRemoteDescription(answer.description);
    return { ok: true };
  }

  close(): void { this.connection?.close(); this.connection = null; this.offer = null; }
}
