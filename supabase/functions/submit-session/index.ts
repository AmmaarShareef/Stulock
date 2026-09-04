// Validates a session before it can touch the leaderboard: state durations must sum
// to wall-clock, focused minutes cannot exceed session length, extension hash checked.
// Not unspoofable - nothing client-side is - but far beyond the zero verification
// every competing study leaderboard performs. Spec: 08.
