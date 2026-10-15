# Rollback and recovery

## Before release

- Tag the release commit and record the deployed Vercel URL and Supabase migration versions.
- Run the read-only backup script and store its encrypted output outside the repository.
- Keep the previous extension ZIP and its version number.

## Web rollback

Promote the last known-good Vercel deployment. Confirm `/`, `/privacy`, `/login`, and `/dashboard` respond, then disable any newly introduced webhook endpoint secret if it is implicated.

## Extension rollback

Publish the prior signed package as a rollback release. Never remove a user’s local data during a rollback; the extension must remain able to open a local report and destroy biometric data.

## Database rollback

Do not run destructive remote reset commands. First suspend the affected release path, take a fresh backup, and restore through the Supabase recovery process using the verified backup. Forward-only migrations are preferred; write a compensating migration and test it locally before applying it remotely.

## Incident response

If a cross-user data path, secret exposure, or raw-vision transmission is suspected: disable sync/camera entry points, rotate the relevant Supabase/Stripe/Vercel secrets, preserve audit evidence, and notify affected users before re-enabling the service.
