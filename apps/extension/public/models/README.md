# Bundled models

These ship inside the extension package. Never fetched from a CDN - the extension CSP
forbids remote script, store review punishes remote code, and a student on campus wifi
should not need a round trip to start studying.

| File | Purpose | Rate |
|---|---|---|
| `face_landmarker.task` | landmarks, blendshapes, head pose | 15 Hz |
| `hand_landmarker.task` | writing bouts, phone-in-hand | 10 Hz |
| `yolo11n.onnx` | phone and notebook detection (COCO) | 2 Hz |
| `mobilefacenet.onnx` | enrolled-face lock | 0.2 Hz |

Total budget: under 30 MB. Asserted at build time.

Spec: section 04.
