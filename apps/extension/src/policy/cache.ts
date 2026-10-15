export type PolicyDecision = "allow" | "warn" | "block";
export type PolicyVerdict = Readonly<{ decision: PolicyDecision; reason: string; confidence: number }>;

type CachedVerdict = Readonly<{ verdict: PolicyVerdict; expiresAt: number }>;

/**
 * Per-session cache. Keys deliberately use a safe local category rather than an
 * origin, path, title, or query string; this object is never persisted.
 */
export class VerdictCache {
  private readonly entries = new Map<string, CachedVerdict>();
  constructor(private readonly now: () => number = Date.now, private readonly ttlMs = 15 * 60_000) {}
  private key(taskId: string, category: string) { return `${taskId}:${category}`; }
  get(taskId: string, category: string): PolicyVerdict | null {
    const entry = this.entries.get(this.key(taskId, category));
    if (!entry || entry.expiresAt <= this.now()) { if (entry) this.entries.delete(this.key(taskId, category)); return null; }
    return entry.verdict;
  }
  set(taskId: string, category: string, verdict: PolicyVerdict): void {
    this.entries.set(this.key(taskId, category), { verdict, expiresAt: this.now() + this.ttlMs });
  }
  clear(): void { this.entries.clear(); }
}
