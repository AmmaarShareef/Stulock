# Support runbook

## First response

Ask for the extension version, browser version, OS, and whether the issue is local monitoring, camera processing, aggregate sync, or account access. Do not ask for camera frames, biometric templates, page addresses, or session task text.

## Safe fixes

- Camera issue: stop camera processing, withdraw consent if requested, and guide the user to destroy the extension’s local biometric data.
- Sync issue: generate a new account-link code; this revokes previous sync grants.
- Relevance false alarm: ask the user to contest it, export only the local report explanation if they choose, and add an anonymized regression case before changing policy.
- Deletion request: verify account ownership through the authenticated request record, complete deletion according to the retention policy, and record completion in the admin audit trail.

## Escalation

Any suspected privacy breach, cross-user access, signed-webhook failure, or secret exposure is an incident: follow [rollback.md](rollback.md) immediately.
