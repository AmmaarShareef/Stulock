import { EmailLoginForm } from "@/components/auth/email-login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <main className="login-page"><section className="login-card"><div className="login-mark">SL</div><p className="eyebrow">Your study account</p><h1>Welcome back.</h1><p>Sign in with your password, create a new account, or use a secure email link. New accounts complete their age and separate camera-consent choices before any camera session can start.</p>{reason === "setup" && <div className="warning">Authentication has not been configured yet.</div>}{reason === "auth" && <div className="warning">That sign-in link could not be verified. Request a new one and try again.</div>}<EmailLoginForm /></section></main>;
}
