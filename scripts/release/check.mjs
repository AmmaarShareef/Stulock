import { readFile } from "node:fs/promises";
import path from "node:path";

const evidencePath = path.resolve("docs/release/release-evidence.json");
const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const required = ["realWorldCorpus", "stagingSmoke", "migrationRehearsal", "backupRestoreRehearsal", "cleanDeviceOnboarding", "consentWithdrawal", "localKeyDestruction", "accountDeletionRequest", "rollbackRehearsal"];
const missing = required.filter((key) => evidence[key] !== "verified");
if (missing.length) {
  console.error(`Release blocked: verify ${missing.join(", ")} in ${path.relative(process.cwd(), evidencePath)}.`);
  process.exit(1);
}
console.log("Release evidence is complete.");
