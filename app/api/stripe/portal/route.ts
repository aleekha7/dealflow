import { NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { getStripe } from "@/lib/stripe";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/portal — create a Stripe Customer Portal session so the
 * user can manage (update card, cancel, resubscribe) their subscription.
 */
export async function POST() {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single<Pick<Profile, "stripe_customer_id">>();

  if (!profile?.stripe_customer_id) {
    return jsonError("No billing profile yet — subscribe first.", 400);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe portal error:", e);
    return jsonError("Could not open the billing portal.", 500);
  }
}
