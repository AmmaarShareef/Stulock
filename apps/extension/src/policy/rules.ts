import { isAllowlistedDomain } from "../session/allowlist";

export const POLICY_CATEGORIES = ["study", "reference", "video", "social", "shopping", "gaming", "news", "unknown"] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];
export type PageDescriptor = Readonly<{ category: PolicyCategory; allowed: boolean }>;

const hostCategories: ReadonlyArray<readonly [string, PolicyCategory]> = [
  ["khanacademy.org", "study"], ["coursera.org", "study"], ["edx.org", "study"], ["canvaslms.com", "study"], ["moodle", "study"],
  ["wikipedia.org", "reference"], ["britannica.com", "reference"], ["scholar.google.com", "reference"], ["arxiv.org", "reference"],
  ["youtube.com", "video"], ["youtu.be", "video"], ["vimeo.com", "video"],
  ["instagram.com", "social"], ["tiktok.com", "social"], ["facebook.com", "social"], ["reddit.com", "social"], ["x.com", "social"], ["twitter.com", "social"],
  ["amazon.", "shopping"], ["ebay.", "shopping"], ["walmart.", "shopping"],
  ["twitch.tv", "gaming"], ["steampowered.com", "gaming"], ["discord.com", "gaming"],
  ["nytimes.com", "news"], ["bbc.", "news"], ["cnn.com", "news"],
];

function categoryForHost(host: string): PolicyCategory {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  const found = hostCategories.find(([match]) => normalized === match || normalized.endsWith(`.${match}`) || normalized.includes(match));
  return found?.[1] ?? "unknown";
}

/** Converts a short-lived browser address into a safe descriptor and drops it. */
export function describePageAddress(address: string, allowedDomains: readonly string[]): PageDescriptor | null {
  try {
    const parsed = new URL(address);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return { category: categoryForHost(host), allowed: isAllowlistedDomain(host, allowedDomains) };
  } catch { return null; }
}
