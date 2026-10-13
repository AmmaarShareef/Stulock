import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const modelDir = path.join(publicDir, "models");
const wasmSource = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmTarget = path.join(publicDir, "wasm");
const models = [
  { file: "face_landmarker.task", url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task", sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff" },
  { file: "hand_landmarker.task", url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task", sha256: "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1" },
  { file: "efficientdet_lite0.tflite", url: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite", sha256: "4b59100025bea1235a84c1038879a6cccc9f6c49f5e41144e91e74d99e780993" },
];
const maxModelBytes = 24 * 1024 * 1024;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function ensureModel(model) {
  const destination = path.join(modelDir, model.file);
  try {
    const existing = await readFile(destination);
    if (sha256(existing) === model.sha256) return existing.byteLength;
  } catch { /* Fetch below. */ }
  const response = await fetch(model.url);
  if (!response.ok) throw new Error(`Could not fetch ${model.file}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = sha256(bytes);
  if (model.sha256.startsWith("SET_")) throw new Error(`Pin ${model.file} to ${digest} before downloading it.`);
  if (digest !== model.sha256) throw new Error(`Integrity check failed for ${model.file}.`);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, destination);
  return bytes.byteLength;
}

await mkdir(modelDir, { recursive: true });
await mkdir(wasmTarget, { recursive: true });
await cp(wasmSource, wasmTarget, { recursive: true, force: true });
const sizes = await Promise.all(models.map(ensureModel));
const total = sizes.reduce((sum, size) => sum + size, 0);
if (total > maxModelBytes) throw new Error(`Vision models are ${(total / 1024 / 1024).toFixed(1)} MB; the local model budget is 24 MB.`);
console.log(`Prepared ${(total / 1024 / 1024).toFixed(1)} MB of local vision models.`);
