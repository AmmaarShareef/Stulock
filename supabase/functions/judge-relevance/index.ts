// Tier 3 of the verdict chain. Deno + the Anthropic TypeScript SDK.
// The task rubric is a stable prefix and gets a cache breakpoint; only the URL and
// title vary. Returns allow | warn | block via structured output.
// The URL and title are never persisted server-side. Spec: 06.
