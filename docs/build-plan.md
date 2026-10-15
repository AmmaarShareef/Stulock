# StuLock build plan

This is an implementation sequence, not a promise to ship every idea at once. A phase is submitted only when its listed tests are green locally and in CI, its manual verification is complete, and the privacy boundary remains intact. Every feature begins by adding or extending the phase's named tests.

## Phase 1 — Trustworthy foundation

**Outcome:** a runnable monorepo with authentication, consent, secure storage boundaries, the admin control plane, and a thin extension shell. This establishes what may leave a user’s device before we collect any monitoring signal.

Build:

- Supabase Auth (email magic link and Google), profile provisioning, age gate, and separate camera consent.
- Apply the profiles, sessions, subscription, admin, flag, and audit-log migration; configure RLS and owner bootstrap.
- Finish extension manifest, popup shell, options/settings, and session-contract form with monitor-only mode.
- Complete the admin panel’s real Supabase connection and seed a non-production account.

Tests to create first:

- `apps/web/lib/admin/auth.test.ts`: unauthenticated, non-admin, inactive-admin, and owner cases.
- `apps/web/app/api/admin/**/*.test.ts`: invitation, revoke, suspension, audit-record, and owner-protection cases.
- `packages/db/src/crypto.test.ts`: encrypted local data cannot be read after key destruction.
- `packages/core/src/architecture/boundaries.test.ts`: keep `core` and `vision` independent of Chrome, React, and the DOM (created now).

Verification gate:

- `pnpm check`, `pnpm test`, and `pnpm --filter @stulock/web build` pass in CI.
- A new account cannot open a camera session until it passes age and explicit-consent checks.
- Direct requests to `/admin` and admin APIs fail for non-admin accounts; an owner invitation, revoke, and audit entry work in Supabase.

## Phase 2 — Extension session vertical slice

**Outcome:** a user can define a study contract, start and stop a local monitor-only session, and receive a useful local report without vision or an LLM.

Build:

- XState session, attention, and intervention machines plus persisted service-worker snapshots.
- Contract capture, tier selection, tab/focus telemetry, allowlist rules, local Dexie persistence, and report timeline.
- Popup, side panel, and extension report dashboard connected to the shared UI components.

Tests to create first:

- `packages/core/src/machines/*.test.ts`: legal and illegal state transitions, recovery after persisted snapshot, and timing boundaries.
- `packages/core/src/scoring/*.test.ts`: score bounds, baseline calibration, recovery, and no double-counted time.
- `apps/extension/src/session/*.test.ts`: contract validation and tier behavior.
- `packages/eval/src/harness.test.ts`: replay a synthetic focus/tab-switch event stream.

Verification gate:

- Unit tests cover every state-machine transition and scoring boundary; all are green in CI.
- Manually reload the extension service worker mid-session and confirm the restored report preserves elapsed time and events.
- Run a 20-minute monitor-only session: report durations add up to wall-clock time and no audible/visual intervention occurs.

## Phase 3 — Privacy-preserving vision and calibration

**Outcome:** on-device vision produces stable, derived attention signals and supports optional phone-camera pairing. No raw video is stored or uploaded.

Build:

- Offscreen camera capture, worker pipeline, model loading, face/presence/idle/phone/writing/fatigue signals, and gaze calibration.
- Frame throttling, quality checks, degradation ladder, and device-performance telemetry.
- WebRTC pairing flow for a phone used as a camera, including pairing expiry and wake lock.
- Label the first representative evaluation clips and wire them into the evaluation harness.

Tests to create first:

- `packages/vision/src/signals/*.test.ts`: hysteresis, missing-frame handling, confidence limits, and signal debounce.
- `packages/vision/src/gaze/*.test.ts`: calibration rejection and known-coordinate feature tests.
- `packages/eval/src/vision-harness.test.ts`: deterministic clip replay and metric aggregation.
- Playwright pairing test: expired/invalid pairing codes never open a media stream.

Verification gate:

- The full test suite plus eval harness passes; recordings demonstrate no outbound image/video request.
- Manual calibration completes in under 90 seconds on target hardware and fails safely on poor-quality input.
- Performance telemetry stays inside the spec’s frame-rate, CPU, and memory budgets on the supported browser.

## Phase 4 — Relevance policy, interventions, and synced product experience

**Outcome:** StuLock can judge task relevance, intervene proportionally, provide an explainable report, and sync only approved session aggregates to the user dashboard.

Build:

- Nano policy judge with server fallback, URL/title minimization, verdict cache, and three-tier allow/warn/block handling.
- Block page, intervention ladder, audio/haptic feedback, contest-a-flag flow, and all report explanations.
- Aggregate-session sync, user dashboard, opt-in leaderboard, subscription/webhook flow, and privacy-policy publication.

Tests to create first:

- `apps/extension/src/policy/*.test.ts`: cache keys, fail-open behavior, structured verdict parsing, and server error handling.
- `apps/extension/src/intervention/*.test.ts`: each escalation/recovery path and monitor-only suppression.
- `supabase/functions/**/*.test.ts`: validation, authorization, and webhook signature cases.
- Playwright end-to-end: contract → compliant/relevant activity → violation → contest → report.

Verification gate:

- A network failure never blocks a legitimate page; an unavailable judge degrades to monitoring and records the reason.
- Every intervention in the report has a timestamp, derived signal, policy reason, and a contest path.
- RLS integration tests prove one user cannot read another user’s sessions, subscriptions, or reports.

## Phase 5 — Evaluation, hardening, and production readiness

**Outcome:** a measurable, deployable v1 that is safe to put in front of real users and defensible in an interview.

Build:

- Grow the labelled corpus to the planned diversity of clips; establish regression baselines and false-alarm dashboards.
- Complete accessibility, browser-permission, abuse, security, dependency, backup/recovery, and observability reviews.
- Production Supabase/Vercel configuration, Stripe live-mode checklist, support runbook, release notes, and rollback plan.

Tests to create first:

- `packages/eval/src/release-gates.test.ts`: retain the release threshold in executable form (created now).
- Regression tests for every previously observed false alarm and every security issue found during review.
- Playwright smoke suite against a staging deployment; migration-upgrade and rollback rehearsal scripts.
- Load/performance test covering a typical session and admin aggregate query.

Verification gate — required for release:

- CI is green; the release build, extension package, database migration rehearsal, and staging smoke tests pass.
- Evaluation corpus reports **fewer than 1 false alarm per hour** for every intervention that will ship. Otherwise that intervention remains monitor-only.
- Security review finds no cross-user data path, no client-held service secret, and no raw vision data transmitted or persisted remotely.
- A clean-device onboarding, consent withdrawal, local key destruction, account deletion request, and rollback are each manually rehearsed and documented.

## Current test baseline

`pnpm test` now runs two permanent architectural checks:

1. `portable package boundary` verifies the core decision that `packages/core` and `packages/vision` cannot import React or Chrome APIs.
2. `release gate specification` verifies that the project retains its measurable false-alarm release threshold.

The GitHub Actions workflow runs type checks, tests, the high-severity production dependency audit, and production web and extension builds on every pull request and every push to `main`. Feature-specific tests are intentionally introduced at the start of their associated phase, before the feature code.
