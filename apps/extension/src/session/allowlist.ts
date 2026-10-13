/** User-entered study-domain preferences. They remain local and Phase 2 never inspects a tab URL. */
export function normalizeAllowedDomains(value: string | undefined): string[] {
  if (!value) return [];
  const domains = value.split(/[\n,\s]+/).map((entry) => entry.trim().toLowerCase()).filter(Boolean).map((entry) => entry.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""));
  return [...new Set(domains.filter((domain) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)))];
}

export function isAllowlistedDomain(domain: string, allowedDomains: readonly string[]): boolean {
  const candidate = domain.trim().toLowerCase().replace(/^www\./, "");
  return allowedDomains.some((allowed) => candidate === allowed || candidate.endsWith(`.${allowed}`));
}
