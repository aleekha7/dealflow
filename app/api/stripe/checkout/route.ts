import { NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { PLAN_NAME } from "@/lib/constants";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

const STRIPE_API = "https://api.stripe.com/v1";

function stripePost(path: string, params: Record<string, string>, key: string) {
  const body = new URLSearchParams(params).toString();
  return fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? `Stripe error ${res.status}`);
    return data;
  });
}

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

  const key = process.env.STRIPE_SECRET_KEY!;
  const priceId = process.env.STRIPE_PRICE_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripePost("/customers", {
        email: profile.email || "",
        name: profile.full_name || "",
        "metadata[supabase_user_id]": user.id,
      }, key);
      customerId = customer.id;

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

    const session = await stripePost("/checkout/sessions", {
      customer: customerId,
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "subscription_data[metadata][supabase_user_id]": user.id,
      "subscription_data[metadata][plan]": PLAN_NAME,
      "metadata[supabase_user_id]": user.id,
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      allow_promotion_codes: "true",
    }, key);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Stripe checkout error:", msg);
    return jsonError(`Checkout failed: ${msg}`, 500);
  }
}
