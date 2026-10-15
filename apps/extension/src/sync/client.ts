import type { LocalSessionReport } from "../report/build";
import type { MonitorSessionSnapshot } from "../session/engine";

export type SyncGrant = Readonly<{ grantId: string; renewalSecret: string; expiresAt: string }>;
export type AggregateSyncPayload = Readonly<{ sessionId: string; startedAt: string; endedAt: string; focusMinutes: number; score: number; violationCount: number }>;
const webOrigin = new URL(import.meta.env.WXT_PUBLIC_STULOCK_WEB_ORIGIN ?? "http://localhost:3000").origin;
export function canUseSyncGrant(grant: SyncGrant | null | undefined, now = Date.now()): grant is SyncGrant { return Boolean(grant && Number.isFinite(Date.parse(grant.expiresAt)) && Date.parse(grant.expiresAt) > now); }
export function aggregateForSync(snapshot: MonitorSessionSnapshot, report: LocalSessionReport): AggregateSyncPayload {
  return { sessionId: snapshot.id, startedAt: snapshot.startedAt, endedAt: snapshot.endedAt ?? snapshot.updatedAt, focusMinutes: Math.round(report.focusedMs / 60_000), score: report.score, violationCount: report.interventions.filter((event) => event.action === "block" || event.action === "nudge").length };
}
export async function redeemSyncCode(code: string): Promise<SyncGrant | null> {
  try {
    const response = await fetch(new URL("/api/extension/sync", webOrigin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "redeem", code: code.trim() }), cache: "no-store" });
    const value = await response.json() as Record<string, unknown>;
    if (value.eligible !== true || typeof value.grantId !== "string" || typeof value.renewalSecret !== "string" || typeof value.expiresAt !== "string") return null;
    const grant = { grantId: value.grantId, renewalSecret: value.renewalSecret, expiresAt: value.expiresAt };
    return canUseSyncGrant(grant) ? grant : null;
  } catch { return null; }
}
export async function syncAggregate(grant: SyncGrant, aggregate: AggregateSyncPayload): Promise<boolean> {
  try {
    const response = await fetch(new URL("/api/extension/sync", webOrigin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", grantId: grant.grantId, renewalSecret: grant.renewalSecret, aggregate }), cache: "no-store" });
    return (await response.json() as { ok?: unknown }).ok === true;
  } catch { return false; }
}
