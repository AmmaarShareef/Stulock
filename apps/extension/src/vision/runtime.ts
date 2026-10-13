import { FilesetResolver, FaceLandmarker, HandLandmarker, ObjectDetector, type FaceLandmarkerResult, type HandLandmarkerResult, type ObjectDetectorResult } from "@mediapipe/tasks-vision";
import { initialVisionPerformanceState, recordInferenceTime, type DerivedVisionSignals, type VisionObservation } from "@stulock/vision";

type VisionWorkerMessage = Readonly<{ type: "signals"; signals: DerivedVisionSignals }>;

export type LocalVisionStatus = Readonly<{
  state: "idle" | "starting" | "running" | "degraded" | "paused" | "error";
  reason?: string;
  lastSignals?: DerivedVisionSignals;
  meanInferenceMs?: number;
}>;

const extensionUrl = (path: string) => new URL(`/${path}`, import.meta.url).toString();
const modelUrl = (name: string) => extensionUrl(`models/${name}`);
const distance = (first: Readonly<{ x: number; y: number }>, second: Readonly<{ x: number; y: number }>) => Math.hypot(first.x - second.x, first.y - second.y);

function faceRatio(result: FaceLandmarkerResult): number {
  const face = result.faceLandmarks[0];
  if (!face?.length) return 0;
  const xs = face.map((landmark) => landmark.x); const ys = face.map((landmark) => landmark.y);
  return Math.max(0, Math.max(...xs) - Math.min(...xs)) * Math.max(0, Math.max(...ys) - Math.min(...ys));
}

function eyeClosed(result: FaceLandmarkerResult): boolean {
  const scores = result.faceBlendshapes[0]?.categories ?? [];
  const left = scores.find((score) => score.categoryName === "eyeBlinkLeft")?.score ?? 0;
  const right = scores.find((score) => score.categoryName === "eyeBlinkRight")?.score ?? 0;
  return (left + right) / 2 >= .55;
}

function phoneDetected(result: ObjectDetectorResult): boolean {
  return result.detections.some((detection) => detection.categories.some((category) => category.categoryName === "cell phone" && category.score >= .55));
}

function handObservation(result: HandLandmarkerResult, previous: Readonly<{ x: number; y: number }> | null): { handDetected: boolean; wrist: Readonly<{ x: number; y: number }> | null; wristMotion: number } {
  const wrist = result.landmarks[0]?.[0];
  if (!wrist) return { handDetected: false, wrist: null, wristMotion: 0 };
  return { handDetected: true, wrist, wristMotion: previous ? distance(previous, wrist) : 0 };
}

async function brightness(video: HTMLVideoElement): Promise<number> {
  const canvas = new OffscreenCanvas(8, 8);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return .5;
  context.drawImage(video, 0, 0, 8, 8);
  const pixels = context.getImageData(0, 0, 8, 8).data;
  let total = 0;
  for (let index = 0; index < pixels.length; index += 4) total += .2126 * (pixels[index] ?? 0) + .7152 * (pixels[index + 1] ?? 0) + .0722 * (pixels[index + 2] ?? 0);
  return total / (255 * 64);
}

export class LocalVisionRuntime {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private timer: number | null = null;
  private worker: Worker | null = null;
  private face: FaceLandmarker | null = null;
  private hand: HandLandmarker | null = null;
  private objects: ObjectDetector | null = null;
  private previousWrist: Readonly<{ x: number; y: number }> | null = null;
  private lastHandAt = 0;
  private lastObjectAt = 0;
  private performance = initialVisionPerformanceState;
  private latestHand = { handDetected: false, wristMotion: 0 };
  private latestPhone = false;

  async start(onStatus: (status: LocalVisionStatus) => void): Promise<void> {
    if (this.stream) return;
    onStatus({ state: "starting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 15 }, facingMode: "user" }, audio: false });
      await this.startWithStream(stream, onStatus);
    } catch (error) {
      this.stop();
      onStatus({ state: "error", reason: error instanceof Error ? error.message : "Camera processing could not start." });
    }
  }

  async startWithStream(stream: MediaStream, onStatus: (status: LocalVisionStatus) => void): Promise<void> {
    if (this.stream) { stream.getTracks().forEach((track) => track.stop()); return; }
    onStatus({ state: "starting" });
    try {
      const files = await FilesetResolver.forVisionTasks(extensionUrl("wasm"));
      const [face, hand, objects] = await Promise.all([
        FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: modelUrl("face_landmarker.task"), delegate: "GPU" }, runningMode: "VIDEO", numFaces: 1, minFaceDetectionConfidence: .65, minFacePresenceConfidence: .65, minTrackingConfidence: .65, outputFaceBlendshapes: true }),
        HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: modelUrl("hand_landmarker.task"), delegate: "GPU" }, runningMode: "VIDEO", numHands: 1, minHandDetectionConfidence: .65, minHandPresenceConfidence: .65, minTrackingConfidence: .65 }),
        ObjectDetector.createFromOptions(files, { baseOptions: { modelAssetPath: modelUrl("efficientdet_lite0.tflite"), delegate: "GPU" }, runningMode: "VIDEO", scoreThreshold: .55, categoryAllowlist: ["cell phone"] }),
      ]);
      this.stream = stream; this.face = face; this.hand = hand; this.objects = objects;
      this.video = document.createElement("video"); this.video.muted = true; this.video.playsInline = true; this.video.srcObject = stream;
      await this.video.play();
      this.worker = new Worker(new URL("./signal-worker.ts", import.meta.url), { type: "module" });
      this.worker.addEventListener("message", (event: MessageEvent<VisionWorkerMessage>) => {
        if (event.data.type !== "signals") return;
        onStatus({ state: this.performance.mode === "paused" ? "paused" : this.performance.mode === "reduced" ? "degraded" : "running", lastSignals: event.data.signals, meanInferenceMs: this.performance.meanInferenceMs });
      });
      onStatus({ state: "running" });
      this.schedule(onStatus);
    } catch (error) {
      this.stop();
      onStatus({ state: "error", reason: error instanceof Error ? error.message : "Camera processing could not start." });
    }
  }

  stop(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.worker?.terminate(); this.worker = null;
    this.face?.close(); this.hand?.close(); this.objects?.close();
    this.face = null; this.hand = null; this.objects = null;
    this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null;
    if (this.video) { this.video.pause(); this.video.srcObject = null; }
    this.video = null; this.previousWrist = null;
  }

  private schedule(onStatus: (status: LocalVisionStatus) => void): void {
    this.timer = window.setTimeout(() => void this.tick(onStatus), this.performance.mode === "reduced" ? 133 : 66);
  }

  private async tick(onStatus: (status: LocalVisionStatus) => void): Promise<void> {
    const video = this.video; const face = this.face;
    if (!video || !face || !this.worker) return;
    const startedAt = performance.now();
    const timestamp = Math.round(startedAt);
    try {
      const faceResult = face.detectForVideo(video, timestamp);
      if (timestamp - this.lastHandAt >= 100) {
        this.lastHandAt = timestamp;
        const hand = handObservation(this.hand?.detectForVideo(video, timestamp) ?? { landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] }, this.previousWrist);
        this.previousWrist = hand.wrist; this.latestHand = hand;
      }
      if (timestamp - this.lastObjectAt >= 500) {
        this.lastObjectAt = timestamp;
        this.latestPhone = phoneDetected(this.objects?.detectForVideo(video, timestamp) ?? { detections: [] });
      }
      const observation: VisionObservation = { at: Date.now(), brightness: await brightness(video), faceRatio: faceRatio(faceResult), faceConfidence: faceResult.faceLandmarks.length ? .9 : 0, faceDetected: faceResult.faceLandmarks.length > 0, eyeClosed: eyeClosed(faceResult), phoneDetected: this.latestPhone, handDetected: this.latestHand.handDetected, wristMotion: this.latestHand.wristMotion };
      this.performance = recordInferenceTime(this.performance, performance.now() - startedAt).state;
      if (this.performance.mode === "paused") onStatus({ state: "paused", reason: "This device is too busy; camera processing paused safely.", meanInferenceMs: this.performance.meanInferenceMs });
      else this.worker.postMessage({ type: "observation", observation });
    } catch (error) {
      onStatus({ state: "error", reason: error instanceof Error ? error.message : "Local vision processing failed." });
      this.stop(); return;
    }
    this.schedule(onStatus);
  }
}
