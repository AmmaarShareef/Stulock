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

export class StuLockDatabase extends Dexie {
  consent!: EntityTable<LocalConsentRecord, "id">;
  templates!: EntityTable<BiometricTemplateRecord, "id">;
  keys!: EntityTable<BiometricKeyRecord, "id">;
  telemetry!: EntityTable<LocalTelemetryRow, "id">;

  constructor() {
    super("stulock");
    this.version(1).stores({ consent: "id, acceptedAt", templates: "id, createdAt", keys: "id, createdAt", telemetry: "++id, sessionId, at" });
  }

  async destroyBiometricData(): Promise<void> {
    await this.transaction("rw", this.keys, this.templates, async () => {
      await this.keys.clear();
      await this.templates.clear();
    });
  }
}

export const localDb = new StuLockDatabase();
