import { NextResponse } from "next/server";

const categories = new Set(["study", "reference", "video", "social", "shopping", "gaming", "news", "unknown"]);
/**
 * Conservative fallback for browsers without the local Prompt API. It receives
 * only a local category and explicit allowlist state, never an address, title,
 * task, page text, or browsing history.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { category?: unknown; allowed?: unknown };
  if (typeof body.category !== "string" || !categories.has(body.category) || typeof body.allowed !== "boolean") return NextResponse.json({ verdict: null }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const verdict = body.allowed ? { decision: "allow", reason: "explicitly_allowed", confidence: 1 } : ["social", "shopping", "gaming"].includes(body.category) ? { decision: "block", reason: "high_confidence_distraction", confidence: 0.96 } : ["video", "news"].includes(body.category) ? { decision: "warn", reason: "needs_relevance_check", confidence: 0.65 } : { decision: "allow", reason: "insufficient_evidence", confidence: 0.2 };
  return NextResponse.json({ verdict }, { headers: { "Cache-Control": "no-store" } });
}
