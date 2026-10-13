import { deriveVisionSignals, initialVisionSignalState, type VisionObservation } from "@stulock/vision";

let state = initialVisionSignalState;

self.addEventListener("message", (event: MessageEvent<{ type: "observation"; observation: VisionObservation }>) => {
  if (event.data.type !== "observation") return;
  const next = deriveVisionSignals(state, event.data.observation);
  state = next.state;
  // Only this reduced signal crosses the worker boundary; frames and landmarks do not.
  self.postMessage({ type: "signals", signals: next.signals });
});
