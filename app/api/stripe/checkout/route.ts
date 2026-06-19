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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const priceId = process.env.STRIPE_PRICE_ID!;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  console.error("[checkout] appUrl:", appUrl, "priceId:", priceId, "hasKey:", !!stripeKey);
  console.error("[checkout] profile email:", profile.email, "status:", profile.subscription_status, "customerId:", profile.stripe_customer_id);

  const stripe = getStripe();

  try {
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      console.error("[checkout] creating Stripe customer...");
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        name: profile.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      console.error("[checkout] customer created:", customerId);

      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (updateError) {
        console.error("[checkout] failed to save customer id:", updateError);
        return jsonError("Failed to save billing profile", 500);
      }
      console.error("[checkout] customer id saved to profile");
    }

    console.error("[checkout] creating checkout session...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: PLAN_NAME },
      },
      metadata: { supabase_user_id: user.id },
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      allow_promotion_codes: true,
    });

    console.error("[checkout] session created:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] error:", e);
    return jsonError("Could not start checkout. Please try again.", 500);
  }
}
