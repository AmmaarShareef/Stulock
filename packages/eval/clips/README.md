# Evaluation corpus

20 clips, 3-5 minutes each. Record each in two lighting conditions with at least two
people. A detector validated on one face in one room is not validated - that is exactly
the mistake the proctoring industry made and never recovered from.

Format: `.y4m` or `.mjpeg` (what the Chrome fake-video-capture flag accepts).
Media is gitignored. Keep it local or use git-lfs.

## Must NOT fire

- reading a notebook for two minutes straight
- eyes closed, thinking, thirty seconds
- someone walks through frame behind you
- phone face-down in jail, untouched
- strong backlight, window behind you
- glasses with heavy glare
- drinking, stretching, adjusting posture

## Must fire

- phone lifted from jail and used
- sustained gaze at a snapped window off-centre

## Must classify correctly

- present but idle: eyes on page, zero input, four minutes -> `idle`
- leaving the desk entirely -> `away`
- camera physically covered -> `away`

Spec: section 10.
