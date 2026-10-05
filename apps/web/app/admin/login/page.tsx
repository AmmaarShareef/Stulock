import { LoginForm } from "@/components/admin/login-form";
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <main className="login-page"><section className="login-card"><div className="login-mark">SL</div><p className="eyebrow">Restricted area</p><h1>StuLock administration</h1><p>Sign in with an email address that has been granted access. This page never reveals whether an account is an administrator.</p>{reason === "setup" && <div className="warning">The secure admin service is not configured yet. Add the values in <code>apps/web/.env.example</code> to your local environment.</div>}<LoginForm /></section></main>;
}
