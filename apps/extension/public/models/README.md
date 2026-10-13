# Bundled models

These ship inside the extension package. Never fetched from a CDN - the extension CSP
forbids remote script, store review punishes remote code, and a student on campus wifi
should not need a round trip to start studying.

| File | Purpose | Rate |
|---|---|---|
| `face_landmarker.task` | landmarks, blink/blendshape features, head pose | 15 Hz |
| `hand_landmarker.task` | writing bouts from hand movement | 10 Hz |
| `efficientdet_lite0.tflite` | cell-phone detection (COCO) | 2 Hz |

The three assets are fetched only by `pnpm prepare:vision-assets`, verified against
the SHA-256 pins in that script, and copied into the built extension. They are never
fetched by an installed extension. Their combined budget is under 24 MB.

Spec: section 04.
