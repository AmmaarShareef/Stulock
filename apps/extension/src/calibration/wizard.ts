// Face enrolment, notebook region, phone-jail rectangle, 9-point gaze calibration.
// Owns the camera directly while running (big preview + landmark mesh), then hands
// off to offscreen when the session starts. Target: under 90s. Spec: 03, 04, 11.
