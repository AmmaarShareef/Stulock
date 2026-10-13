import Link from "next/link";
import { WithdrawConsent } from "@/components/auth/withdraw-consent";
import { requireOnboardedUser } from "@/lib/auth/user";
export default async function DashboardPage() { const user = await requireOnboardedUser(); return <main className="onboarding-page"><section className="onboarding-card"><p className="eyebrow">Your study space</p><h1>Welcome, {user.email}</h1><p>Your account is ready for local study sessions. Monitor-only mode stays available, and camera processing is optional: it requires your separate consent, a one-time setup code, and a browser permission prompt.</p><Link className="button" href="/cam">Set up local camera processing</Link><WithdrawConsent /></section></main>; }
