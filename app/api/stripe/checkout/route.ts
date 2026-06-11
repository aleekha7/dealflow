import { NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { getStripe } from "@/lib/stripe";
import { PLAN_NAME } from "@/lib/constants";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/checkout — create a Stripe Checkout session for the
 * DealFlow Pro subscription and return its URL.
 */
export async function POST() {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return jsonError("Profile not found", 404);
  if (profile.subscription_status === "active") {
    return jsonError("You already have an active subscription");
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    // Reuse the Stripe customer if one exists; otherwise create it now so
    // the webhook can match events back to this user.
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Stored via the user's own session would be blocked by column grants,
      // so this uses the service-role path: an RPC-free direct update is
      // fine here because the route runs server-side with the admin client.
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (updateError) {
        return jsonError("Failed to save billing profile", 500);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: PLAN_NAME },
      },
      metadata: { supabase_user_id: user.id },
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return jsonError("Could not start checkout. Please try again.", 500);
  }
}
