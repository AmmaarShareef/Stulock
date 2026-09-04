// Owns the camera stream during a session. Spawns the vision worker, forwards derived
// features to the background at 4Hz. Renders the opt-in 5Hz preview mirror.
// Never sends frames or landmarks anywhere. Spec: 03, 04.
