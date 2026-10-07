import { WithdrawConsent } from "@/components/auth/withdraw-consent";
import { requireOnboardedUser } from "@/lib/auth/user";
export default async function DashboardPage() { const user = await requireOnboardedUser(); return <main className="onboarding-page"><section className="onboarding-card"><p className="eyebrow">Your study space</p><h1>Welcome, {user.email}</h1><p>Your account is ready for the Phase 1 extension shell. Session monitoring and reports arrive in Phase 2; camera processing arrives only after that and remains gated by your consent.</p><WithdrawConsent /></section></main>; }
