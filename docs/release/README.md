# Phase 5 release gate

`pnpm release:check` is intentionally failing until every entry in `release-evidence.json` is changed to `verified` by the person who performed the corresponding rehearsal. Do not change evidence based on unit-test output alone.

The synthetic CI corpus protects known regressions; it does not certify real-world vision or intervention quality. Launch requires consented, labelled recordings that cover the scenarios in `packages/eval/src/fixtures/phase5-regression-corpus.ts` and show fewer than one false alarm per hour for each intervention that will ship. If an intervention has insufficient evidence, leave it monitor-only.

## Required order

1. Run `pnpm check`, `pnpm test`, production web/extension builds, and `pnpm audit --prod --audit-level=high`.
2. Run the local migration rehearsal with `scripts/release/rehearse-migrations.ps1 -IUnderstandThisDestroysLocalSupabaseData`.
3. Run the staging smoke workflow with a real HTTPS `STAGING_BASE_URL`.
4. Create an encrypted public-schema backup using `scripts/release/backup-supabase.ps1` and rehearse recovery according to [rollback.md](rollback.md).
5. Perform and record the manual account/privacy rehearsals. Then update only the evidence items you actually verified.
