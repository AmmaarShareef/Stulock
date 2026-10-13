import { nextDebounced, type DebouncedState } from "./debounce";
import { nextFatigue, type FatigueState } from "./fatigue";
import { nextPresence, type PresenceState } from "./presence";
import { assessFrameQuality, type FrameQuality } from "./quality";

export type VisionObservation = Readonly<{ at: number; brightness: number; faceRatio: number; faceConfidence: number; faceDetected: boolean; eyeClosed: boolean; phoneDetected: boolean; handDetected: boolean; wristMotion: number }>;
export type VisionSignalState = Readonly<{ presence: PresenceState; phone: DebouncedState; writing: DebouncedState; fatigue: FatigueState }>;
export type DerivedVisionSignals = Readonly<{ at: number; quality: FrameQuality; present: boolean; phoneVisible: boolean; writing: boolean; fatigueSuggestion: boolean; perclos: number }>;

export const initialVisionSignalState: VisionSignalState = {
  presence: { present: false, missingFrames: 0, presentFrames: 0 },
  phone: { active: false, positiveFrames: 0, negativeFrames: 0 },
  writing: { active: false, positiveFrames: 0, negativeFrames: 0 },
  fatigue: { samples: [] },
};

/** Browser-free fusion boundary: output contains no landmarks, frames, or identifiers. */
export function deriveVisionSignals(state: VisionSignalState, observation: VisionObservation): { state: VisionSignalState; signals: DerivedVisionSignals } {
  const quality = assessFrameQuality({ brightness: observation.brightness, faceRatio: observation.faceRatio, confidence: observation.faceConfidence });
  const presence = nextPresence(state.presence, quality.usable && observation.faceDetected);
  const phone = nextDebounced(state.phone, quality.usable && observation.phoneDetected, { activateAfter: 2, clearAfter: 3 });
  const writing = nextDebounced(state.writing, quality.usable && observation.handDetected && observation.wristMotion >= 0.015, { activateAfter: 3, clearAfter: 5 });
  const fatigue = nextFatigue(state.fatigue, { at: observation.at, closed: quality.usable && observation.eyeClosed });
  const next = { presence, phone, writing, fatigue: fatigue.state };
  return { state: next, signals: { at: observation.at, quality, present: presence.present, phoneVisible: phone.active, writing: writing.active, fatigueSuggestion: fatigue.fatigued, perclos: fatigue.perclos } };
}
