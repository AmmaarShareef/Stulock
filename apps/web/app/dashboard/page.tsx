import Link from "next/link";
import { AccountDeletionRequest } from "@/components/auth/account-deletion-request";
import { ExtensionSyncCode } from "@/components/auth/extension-sync-code";
import { LeaderboardPreferences } from "@/components/auth/leaderboard-preferences";
import { PasswordSettings } from "@/components/auth/password-settings";
import { WithdrawConsent } from "@/components/auth/withdraw-consent";
import { requireOnboardedUser } from "@/lib/auth/user";
import { buildDashboardMetrics, type DashboardSession } from "@/lib/dashboard-metrics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionRow = { id: string; started_at: string; ended_at: string | null; focus_minutes: number | null; score: number | null; violation_count: number | null };

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value));
}

function trendLabel(change: number): string {
  if (change === 0) return "Same as last week";
  return `${change > 0 ? "+" : "−"}${formatMinutes(Math.abs(change))} vs. last week`;
}

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 13 * 86_400_000).toISOString();
  const [{ data: sessions }, { data: preference }] = await Promise.all([
    supabase!.from("sessions").select("id,started_at,ended_at,focus_minutes,score,violation_count").eq("user_id", user.id).gte("started_at", fourteenDaysAgo).order("started_at", { ascending: false }).limit(200),
    supabase!.rpc("get_my_leaderboard_preference"),
  ]);
  const rows = (sessions ?? []) as SessionRow[];
  const metrics = buildDashboardMetrics(rows.map((session): DashboardSession => ({ id: session.id, startedAt: session.started_at, endedAt: session.ended_at, focusMinutes: session.focus_minutes, score: session.score, violationCount: session.violation_count })), now);
  const currentPreference = preference as { optedIn?: boolean; displayName?: string } | null;
  const chartMaximum = Math.max(60, ...metrics.days.map((day) => day.minutes));

  return <main className="dashboard-page">
    <header className="dashboard-header">
      <div><p className="eyebrow">Your study space</p><h1>Make this week count.</h1><p>{user.email} · Only session aggregates you explicitly sync appear here.</p></div>
      <div className="dashboard-header-actions"><Link className="dashboard-ghost-button" href="/cam">Camera setup</Link><Link className="dashboard-signout" href="/auth/signout">Sign out</Link></div>
    </header>

    <section className="dashboard-hero">
      <div><p className="eyebrow">This week</p><strong>{formatMinutes(metrics.focusedMinutes)}</strong><p className="dashboard-trend">{trendLabel(metrics.focusedMinutesChange)}</p></div>
      <div className="goal-copy"><span>{metrics.goalProgress}% of your 5-hour weekly focus target</span><div className="goal-track" aria-label={`${metrics.goalProgress}% of weekly goal complete`}><i style={{ width: `${metrics.goalProgress}%` }} /></div><p>{metrics.sessionCount ? `${metrics.sessionCount} sessions recorded across the last seven days.` : "Sync a completed extension session to begin your weekly record."}</p></div>
    </section>

    <section className="dashboard-stats" aria-label="Weekly study metrics">
      <article><span>Focus score</span><strong>{metrics.averageScore === null ? "—" : `${metrics.averageScore}%`}</strong><small>{metrics.averageScore === null ? "Appears after your first synced session" : "Average across this week"}</small></article>
      <article><span>Focus rate</span><strong>{metrics.focusRate === null ? "—" : `${metrics.focusRate}%`}</strong><small>Focused minutes out of session time</small></article>
      <article><span>Current streak</span><strong>{metrics.currentStreak} {metrics.currentStreak === 1 ? "day" : "days"}</strong><small>Consecutive days with a session</small></article>
      <article><span>Interventions</span><strong>{metrics.interventions}</strong><small>Count only; details stay in your extension</small></article>
    </section>

    <section className="dashboard-grid">
      <article className="dashboard-panel weekly-panel"><div className="panel-heading"><div><p className="eyebrow">Weekly rhythm</p><h2>Your focus, day by day</h2></div><span>{metrics.bestDay ? `${metrics.bestDay.label} was your best day` : "Your first session will appear here"}</span></div><div className="focus-chart" role="img" aria-label="Focused minutes by day this week">{metrics.days.map((day) => <div className="chart-day" key={day.date}><div className="chart-value">{day.minutes ? formatMinutes(day.minutes) : ""}</div><div className="chart-column"><i style={{ height: `${Math.max(day.minutes ? 8 : 2, Math.round((day.minutes / chartMaximum) * 100))}%` }} /></div><strong>{day.label}</strong><small>{day.sessions ? `${day.sessions} session${day.sessions === 1 ? "" : "s"}` : "No session"}</small></div>)}</div></article>
      <article className="dashboard-panel insight-panel"><p className="eyebrow">A useful signal</p><h2>{metrics.bestDay ? `${formatMinutes(metrics.bestDay.minutes)} on ${metrics.bestDay.label}` : "Your dashboard is ready when you are."}</h2><p>{metrics.bestDay ? "That is your strongest focused day this week. A repeatable session time is more useful than chasing a perfect score." : "Generate an account-link code below, redeem it in the extension, and complete one study session. No detailed activity or camera data will be synced."}</p><Link className="dashboard-text-link" href="#account-controls">Manage sync and privacy controls <span>→</span></Link></article>
    </section>

    <section className="dashboard-panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">Recent activity</p><h2>Synced sessions</h2></div><span>Last 14 days</span></div>{rows.length ? <div className="session-table-wrap"><table className="session-table"><thead><tr><th>Date</th><th>Focused</th><th>Score</th><th>Interventions</th></tr></thead><tbody>{rows.slice(0, 8).map((session) => <tr key={session.id}><td>{formatDate(session.started_at)}</td><td>{formatMinutes(session.focus_minutes ?? 0)}</td><td>{session.score === null ? "—" : `${Math.round(Number(session.score))}%`}</td><td>{session.violation_count ?? 0}</td></tr>)}</tbody></table></div> : <div className="dashboard-empty"><strong>No synced sessions yet</strong><p>Your extension keeps detailed reports locally. Link it only if you want these high-level totals here.</p></div>}</section>

    <section id="account-controls" className="dashboard-controls"><div><p className="eyebrow">Your controls</p><h2>Account, sync, and privacy</h2><p>These settings are separate from your study data. Make changes only when you choose to.</p></div><div className="dashboard-control-list"><details open><summary>Quick sign-in <span>Set a password</span></summary><PasswordSettings email={user.email} /></details><details><summary>Extension sync <span>Optional</span></summary><ExtensionSyncCode /></details><details><summary>Leaderboard <span>Opt in</span></summary><LeaderboardPreferences initialOptIn={currentPreference?.optedIn ?? false} initialName={currentPreference?.displayName ?? ""} /></details><details><summary>Camera consent and account deletion <span>Privacy</span></summary><WithdrawConsent /><AccountDeletionRequest /></details></div>
    </section>
  </main>;
}
