import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyStripeSignature } from "@/lib/stripe-webhook";

type StripeSubscription = { id?: unknown; customer?: unknown; status?: unknown; current_period_end?: unknown; metadata?: { user_id?: unknown; plan?: unknown } };
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET; if (!secret) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  const rawBody = await request.text(); if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  const event = JSON.parse(rawBody) as { type?: unknown; data?: { object?: StripeSubscription } };
  if (typeof event.type !== "string" || !event.type.startsWith("customer.subscription.")) return NextResponse.json({ received: true });
  const subscription = event.data?.object; const userId = subscription?.metadata?.user_id;
  if (!subscription || typeof subscription.id !== "string" || typeof subscription.customer !== "string" || typeof subscription.status !== "string" || typeof subscription.current_period_end !== "number" || typeof userId !== "string") return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  const admin = createSupabaseAdminClient(); if (!admin) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  const { error } = await admin.from("subscriptions").upsert({ user_id: userId, stripe_customer_id: subscription.customer, stripe_subscription_id: subscription.id, plan: typeof subscription.metadata?.plan === "string" ? subscription.metadata.plan : "pro", status: subscription.status, current_period_end: new Date(subscription.current_period_end * 1000).toISOString(), updated_at: new Date().toISOString() }, { onConflict: "stripe_subscription_id" });
  return error ? NextResponse.json({ error: "subscription_update_failed" }, { status: 500 }) : NextResponse.json({ received: true });
}
