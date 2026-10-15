import { localDb } from "@stulock/db";
import { browser } from "wxt/browser";
const RETENTION_DAYS = 90;
export function retentionCutoff(now = new Date()): string { return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60_000).toISOString(); }

/** Detailed reports and telemetry are local-only and pruned on a rolling 90-day schedule. */
export async function pruneExpiredLocalData(now = new Date()): Promise<void> {
  const cutoff = retentionCutoff(now);
  await localDb.transaction("rw", localDb.telemetry, localDb.sessionSnapshots, localDb.reports, localDb.policyEvents, async () => {
    await localDb.telemetry.where("at").below(cutoff).delete();
    await localDb.sessionSnapshots.where("updatedAt").below(cutoff).delete();
    await localDb.reports.where("createdAt").below(cutoff).delete();
    await localDb.policyEvents.where("at").below(cutoff).delete();
  });
}
export async function destroyLocalBiometricData(): Promise<void> {
  await localDb.destroyBiometricData();
  await browser.runtime.sendMessage({ type: "phase3:stop-local-vision" }).catch(() => undefined);
  await browser.storage.local.remove(["phase1:camera-enabled", "phase1:camera-consent", "phase3:camera-grant", "phase3:vision-status"]);
}
