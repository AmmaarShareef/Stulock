import { localDb } from "@stulock/db";
import { browser } from "wxt/browser";
export async function destroyLocalBiometricData(): Promise<void> {
  await localDb.destroyBiometricData();
  await browser.runtime.sendMessage({ type: "phase3:stop-local-vision" }).catch(() => undefined);
  await browser.storage.local.remove(["phase1:camera-enabled", "phase1:camera-consent", "phase3:camera-grant", "phase3:vision-status"]);
}
