import { fitRidge, type GazeModel, type GazePoint } from "./ridge";
export type CalibrationSample = Readonly<{ target: GazePoint; features: readonly number[]; quality: number }>;
export type Calibration = Readonly<{ samples: readonly CalibrationSample[] }>;
export function createCalibration(): Calibration { return { samples: [] }; }
export function addCalibrationSample(calibration: Calibration, sample: CalibrationSample): { accepted: boolean; calibration: Calibration } { if (sample.quality < .65) return { accepted: false, calibration }; return { accepted: true, calibration: { samples: [...calibration.samples, sample] } }; }
export function finalizeCalibration(calibration: Calibration): { ok: true; model: GazeModel } | { ok: false; reason: "not_enough_samples" | "ill_conditioned" } { if (calibration.samples.length < 30) return { ok: false, reason: "not_enough_samples" }; try { return { ok: true, model: fitRidge(calibration.samples) }; } catch { return { ok: false, reason: "ill_conditioned" }; } }
