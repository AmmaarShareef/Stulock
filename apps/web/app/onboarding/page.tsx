import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireUser } from "@/lib/auth/user";
export default async function OnboardingPage() { const user = await requireUser(); return <main className="onboarding-page"><section className="onboarding-card"><p className="eyebrow">Before you start</p><h1>Specific consent, not a surprise.</h1><p>StuLock needs separate permission before it can use your camera. Take a moment to understand and choose.</p><OnboardingForm email={user.email} /></section></main>; }
