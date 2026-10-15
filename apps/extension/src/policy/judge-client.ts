import type { PolicyVerdict } from "./cache";
import type { PolicyCategory } from "./rules";

export type JudgeInput = Readonly<{ task: string; category: PolicyCategory; allowed: boolean }>;
export type JudgeResult = Readonly<{ mode: "verdict"; source: "on_device" | "server_fallback"; verdict: PolicyVerdict }> | Readonly<{ mode: "monitor"; reason: "judge_unavailable" | "invalid_verdict" }>;
export type JudgeDependencies = Readonly<{ onDevice: (input: JudgeInput) => Promise<PolicyVerdict | null>; fallback: (input: Pick<JudgeInput, "category" | "allowed">) => Promise<PolicyVerdict | null> }>;

const decisions = new Set(["allow", "warn", "block"]);
export function parseVerdict(value: string | unknown): PolicyVerdict | null {
  let candidate: unknown = value;
  if (typeof value === "string") { try { candidate = JSON.parse(value); } catch { return null; } }
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Record<string, unknown>;
  if (!decisions.has(record.decision as string) || typeof record.reason !== "string" || !/^[a-z0-9_]{3,64}$/.test(record.reason) || typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1) return null;
  return { decision: record.decision as PolicyVerdict["decision"], reason: record.reason, confidence: record.confidence };
}

/** A fallback sees category/allowlist state only — never a page address, title, or task text. */
export async function judgeRelevance(input: JudgeInput, dependencies: JudgeDependencies): Promise<JudgeResult> {
  try {
    const local = await dependencies.onDevice(input);
    if (local) return { mode: "verdict", source: "on_device", verdict: local };
  } catch { /* Continue to the privacy-minimized fallback. */ }
  try {
    const fallback = await dependencies.fallback({ category: input.category, allowed: input.allowed });
    if (fallback) return { mode: "verdict", source: "server_fallback", verdict: fallback };
  } catch { /* Fail open below. */ }
  return { mode: "monitor", reason: "judge_unavailable" };
}
