/**
 * Deterministic regression cases distilled from labelled derived observations.
 * These preserve known false-alarm scenarios in CI; real, consented video clips
 * are separately required in docs/release/release-evidence.json before launch.
 */
export const phase5RegressionCorpus = [
  "notebook_reading", "eyes_closed_thinking", "background_walker", "phone_face_down", "strong_backlight",
  "glare_glasses", "drinking", "stretching", "posture_adjustment", "phone_lifted", "phone_used",
  "off_center_gaze", "present_idle", "left_desk", "camera_covered", "study_video_allowed",
  "social_site_block", "shopping_site_block", "relevant_page_contested", "network_judge_failure",
] as const;

export const syntheticInterventionEvidence = [
  { intervention: "policy_block", observedSeconds: 14_400, falseAlarms: 1 },
  { intervention: "visual_notice", observedSeconds: 10_800, falseAlarms: 0 },
  { intervention: "audio_nudge", observedSeconds: 10_800, falseAlarms: 0 },
] as const;
