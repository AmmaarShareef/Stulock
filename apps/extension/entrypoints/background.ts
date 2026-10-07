import { createSessionContract, validateSessionContract } from "../src/session/contract";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

type Message = { type: "phase1:get-status" } | { type: "phase1:save-contract"; input: { task: string; durationMinutes: number; tier: "monitor" | "light" | "average" | "locked"; allowedHelp?: string } };
const CONTRACT_KEY = "phase1:pending-contract";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await browser.storage.local.set({ "phase1:extension-version": 1, "phase1:camera-enabled": false });
    await browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
  });
  browser.runtime.onMessage.addListener(async (message: Message) => {
    if (message.type === "phase1:get-status") {
      const stored = await browser.storage.local.get([CONTRACT_KEY, "phase1:camera-enabled"]);
      return { contract: stored[CONTRACT_KEY] ?? null, cameraEnabled: false };
    }
    if (message.type === "phase1:save-contract") {
      const issues = validateSessionContract(message.input);
      if (issues.length) return { ok: false, issues };
      const contract = createSessionContract(message.input);
      await browser.storage.local.set({ [CONTRACT_KEY]: contract });
      return { ok: true, contract };
    }
    return undefined;
  });
});
