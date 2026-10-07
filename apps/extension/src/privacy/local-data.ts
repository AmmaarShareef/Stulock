import { localDb } from "@stulock/db";
import { browser } from "wxt/browser";
export async function destroyLocalBiometricData(): Promise<void> {
  await localDb.destroyBiometricData();
  await browser.storage.local.remove(["phase1:camera-enabled", "phase1:camera-consent"]);
}
