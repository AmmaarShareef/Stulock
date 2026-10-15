import Dexie, { type EntityTable } from "dexie";
import type { EncryptedSecret } from "./crypto";

export type LocalConsentRecord = {
  id: "camera";
  policyVersion: string;
  acceptedAt: string;
  revokedAt?: string;
};
export type BiometricTemplateRecord = { id: "face-template"; encrypted: EncryptedSecret; createdAt: string };
export type BiometricKeyRecord = { id: "biometric"; key: CryptoKey; createdAt: string };
export type LocalTelemetryRow = { id?: number; sessionId: string; at: string; event: string; value?: number };
export type LocalSessionSnapshotRecord = { id: string; status: string; snapshot: unknown; updatedAt: string };
export type LocalReportRecord = { id: string; sessionId: string; score: number; report: unknown; createdAt: string };
export type LocalPolicyEventRecord = { id: string; sessionId: string; at: string; category: string; verdict: "allow" | "warn" | "block" | "monitor"; action: "none" | "recover" | "notice" | "audio" | "nudge" | "block"; derivedSignal: "local_category" | "judge_unavailable"; policyReason: string; contestPath: string; contested: boolean };

export class StuLockDatabase extends Dexie {
  consent!: EntityTable<LocalConsentRecord, "id">;
  templates!: EntityTable<BiometricTemplateRecord, "id">;
  keys!: EntityTable<BiometricKeyRecord, "id">;
  telemetry!: EntityTable<LocalTelemetryRow, "id">;
  sessionSnapshots!: EntityTable<LocalSessionSnapshotRecord, "id">;
  reports!: EntityTable<LocalReportRecord, "id">;
  policyEvents!: EntityTable<LocalPolicyEventRecord, "id">;

  constructor() {
    super("stulock");
    this.version(1).stores({ consent: "id, acceptedAt", templates: "id, createdAt", keys: "id, createdAt", telemetry: "++id, sessionId, at" });
    this.version(2).stores({ consent: "id, acceptedAt", templates: "id, createdAt", keys: "id, createdAt", telemetry: "++id, sessionId, at", sessionSnapshots: "id, status, updatedAt", reports: "id, sessionId, createdAt, score" });
    this.version(3).stores({ consent: "id, acceptedAt", templates: "id, createdAt", keys: "id, createdAt", telemetry: "++id, sessionId, at", sessionSnapshots: "id, status, updatedAt", reports: "id, sessionId, createdAt, score", policyEvents: "id, sessionId, at, contested" });
  }

  async destroyBiometricData(): Promise<void> {
    await this.transaction("rw", this.keys, this.templates, async () => {
      await this.keys.clear();
      await this.templates.clear();
    });
  }
}

export const localDb = new StuLockDatabase();
