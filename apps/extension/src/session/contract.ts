import { type SessionContract, type SessionContractInput, SESSION_TIERS } from "@stulock/core";

const MAX_DURATION_MINUTES = 12 * 60;
export function validateSessionContract(input: Partial<SessionContractInput>): string[] {
  const issues: string[] = [];
  if (typeof input.task !== "string" || input.task.trim().length < 3) issues.push("task");
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes! < 1 || input.durationMinutes! > MAX_DURATION_MINUTES) issues.push("durationMinutes");
  if (!SESSION_TIERS.includes(input.tier as SessionContractInput["tier"])) issues.push("tier");
  return issues;
}
export function createSessionContract(input: SessionContractInput, now = new Date()): SessionContract {
  const issues = validateSessionContract(input);
  if (issues.length) throw new Error(`Invalid session contract: ${issues.join(", ")}`);
  return Object.freeze({ id: crypto.randomUUID(), task: input.task.trim(), durationMinutes: input.durationMinutes, tier: input.tier, allowedHelp: input.allowedHelp?.trim() || undefined, createdAt: now.toISOString() });
}
