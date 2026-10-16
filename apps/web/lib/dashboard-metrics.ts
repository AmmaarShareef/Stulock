export type DashboardSession = Readonly<{
  id: string;
  startedAt: string;
  endedAt: string | null;
  focusMinutes: number | null;
  score: number | null;
  violationCount: number | null;
}>;

export type DashboardDay = Readonly<{ date: string; label: string; minutes: number; sessions: number }>;

const DAY_MS = 86_400_000;
export const WEEKLY_FOCUS_GOAL_MINUTES = 300;

function utcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, amount: number): Date {
  return new Date(value.getTime() + amount * DAY_MS);
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function sessionMinutes(session: DashboardSession): number {
  return Math.max(0, session.focusMinutes ?? 0);
}

function elapsedMinutes(session: DashboardSession): number {
  if (!session.endedAt) return 0;
  const elapsed = Date.parse(session.endedAt) - Date.parse(session.startedAt);
  return Number.isFinite(elapsed) && elapsed > 0 ? elapsed / 60_000 : 0;
}

function scoreValues(sessions: readonly DashboardSession[]): number[] {
  return sessions.flatMap((session) => typeof session.score === "number" && Number.isFinite(session.score) ? [session.score] : []);
}

export function buildDashboardMetrics(sessions: readonly DashboardSession[], now = new Date()) {
  const today = utcDay(now);
  const currentWeekStart = addDays(today, -6);
  const previousWeekStart = addDays(currentWeekStart, -7);
  const currentStartTime = currentWeekStart.getTime();
  const previousStartTime = previousWeekStart.getTime();
  const todayEndTime = addDays(today, 1).getTime();
  const currentSessions = sessions.filter((session) => {
    const startedAt = Date.parse(session.startedAt);
    return Number.isFinite(startedAt) && startedAt >= currentStartTime && startedAt < todayEndTime;
  });
  const previousSessions = sessions.filter((session) => {
    const startedAt = Date.parse(session.startedAt);
    return Number.isFinite(startedAt) && startedAt >= previousStartTime && startedAt < currentStartTime;
  });
  const minutesByDate = new Map<string, number>();
  const sessionsByDate = new Map<string, number>();
  for (const session of currentSessions) {
    const key = dateKey(utcDay(new Date(session.startedAt)));
    minutesByDate.set(key, (minutesByDate.get(key) ?? 0) + sessionMinutes(session));
    sessionsByDate.set(key, (sessionsByDate.get(key) ?? 0) + 1);
  }
  const formatter = new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" });
  const days: DashboardDay[] = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(currentWeekStart, index);
    const key = dateKey(day);
    return { date: key, label: formatter.format(day), minutes: minutesByDate.get(key) ?? 0, sessions: sessionsByDate.get(key) ?? 0 };
  });
  const focusedMinutes = currentSessions.reduce((total, session) => total + sessionMinutes(session), 0);
  const previousFocusedMinutes = previousSessions.reduce((total, session) => total + sessionMinutes(session), 0);
  const scores = scoreValues(currentSessions);
  const totalElapsedMinutes = currentSessions.reduce((total, session) => total + elapsedMinutes(session), 0);
  const activeDates = new Set(currentSessions.map((session) => dateKey(utcDay(new Date(session.startedAt)))));
  let currentStreak = 0;
  for (let index = 0; index < 7; index += 1) {
    if (!activeDates.has(dateKey(addDays(today, -index)))) break;
    currentStreak += 1;
  }
  const bestDay = days.reduce<DashboardDay | null>((best, day) => day.minutes > (best?.minutes ?? 0) ? day : best, null);
  return {
    days,
    focusedMinutes,
    focusedMinutesChange: focusedMinutes - previousFocusedMinutes,
    sessionCount: currentSessions.length,
    averageScore: scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : null,
    focusRate: totalElapsedMinutes > 0 ? Math.min(100, Math.round((focusedMinutes / totalElapsedMinutes) * 100)) : null,
    currentStreak,
    interventions: currentSessions.reduce((total, session) => total + Math.max(0, session.violationCount ?? 0), 0),
    weeklyGoalMinutes: WEEKLY_FOCUS_GOAL_MINUTES,
    goalProgress: Math.min(100, Math.round((focusedMinutes / WEEKLY_FOCUS_GOAL_MINUTES) * 100)),
    bestDay: bestDay?.minutes ? bestDay : null,
  };
}
