# Production configuration checklist

Do not reuse local-development values in production. Configure these only in the hosting provider’s encrypted environment settings:

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | web and extension link flows | Production Supabase project URL only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web/browser auth | Public anon key; RLS remains mandatory. |
| `SUPABASE_SERVICE_ROLE_KEY` | protected admin and verified Stripe updates | Server-only. Never prefix with `NEXT_PUBLIC_` and never place in the extension. |
| `ADMIN_BOOTSTRAP_EMAILS` | initial owner provisioning | Remove after owner access is confirmed. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook | Live endpoint secret; missing secret makes webhook fail closed. |
| `STAGING_BASE_URL` | manual staging smoke workflow | HTTPS staging URL, never production. |

Before deployment, set Supabase Auth site/redirect URLs to the deployed HTTPS domain, restrict Vercel production deployments to `main`, add the Stripe webhook endpoint only after the live secret is present, and run the staging workflow. Record all results in [release-evidence.json](release-evidence.json).
