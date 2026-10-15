export type AggregateSession = Readonly<{ sessionId: string; startedAt: string; endedAt: string; focusMinutes: number; score: number; violationCount: number }>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));

/** Keep the wire contract intentionally small and reject extra browser/context fields. */
export function validateAggregateSession(value: unknown): { ok: true; value: AggregateSession } | { ok: false; reason: "invalid_payload" } {
  if (!value || typeof value !== "object") return { ok: false, reason: "invalid_payload" };
  const row = value as Record<string, unknown>; const allowed = new Set(["sessionId", "startedAt", "endedAt", "focusMinutes", "score", "violationCount"]);
  if (Object.keys(row).some((key) => !allowed.has(key)) || typeof row.sessionId !== "string" || !uuid.test(row.sessionId) || !validDate(row.startedAt) || !validDate(row.endedAt) || Date.parse(row.endedAt as string) < Date.parse(row.startedAt as string) || !Number.isInteger(row.focusMinutes) || (row.focusMinutes as number) < 0 || (row.focusMinutes as number) > 720 || typeof row.score !== "number" || row.score < 0 || row.score > 100 || !Number.isInteger(row.violationCount) || (row.violationCount as number) < 0 || (row.violationCount as number) > 1000) return { ok: false, reason: "invalid_payload" };
  return { ok: true, value: row as unknown as AggregateSession };
}
