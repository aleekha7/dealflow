import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Lazily-initialized Stripe client (server-side only). */
export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createNodeHttpClient(),
    });
  }
  return stripe;
}
