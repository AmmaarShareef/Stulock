export type PresenceState = Readonly<{ present: boolean; missingFrames: number; presentFrames: number }>;
/** Hysteresis prevents one dropped frame from becoming an away signal. */
export function nextPresence(state: PresenceState, faceDetected: boolean): PresenceState { if (faceDetected) { const presentFrames = state.presentFrames + 1; return { present: state.present || presentFrames >= 2, presentFrames, missingFrames: 0 }; } const missingFrames = state.missingFrames + 1; return { present: state.present && missingFrames < 3, missingFrames, presentFrames: 0 }; }
