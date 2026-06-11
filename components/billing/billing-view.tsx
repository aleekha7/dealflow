"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/client-api";
import { PLAN_NAME, PLAN_PRICE } from "@/lib/constants";
import { trialDaysLeft } from "@/lib/utils";
import type { Profile } from "@/types";

const PLAN_FEATURES = [
  "Unlimited contacts & CSV import",
  "Drag-and-drop outreach pipeline",
  "Email template library with merge tags",
  "Daily follow-up reminder digest",
  "Reply-rate & pipeline analytics",
];

function StatusBadge({ status }: { status: Profile["subscription_status"] }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-600">
          Active
        </Badge>
      );
    case "trial":
      return <Badge variant="secondary">Free trial</Badge>;
    case "past_due":
      return <Badge variant="destructive">Payment failed</Badge>;
    case "canceled":
      return <Badge variant="outline">Canceled</Badge>;
  }
}

function BillingContent({ profile }: { profile: Profile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [working, setWorking] = React.useState<"checkout" | "portal" | null>(
    null
  );

  React.useEffect(() => {
    if (searchParams.get("success")) {
      toast.success(
        "Payment successful — welcome to DealFlow Pro! It may take a few seconds for your subscription to activate."
      );
      router.replace("/billing");
      // The webhook flips subscription_status; refresh shortly after to pick
      // it up without requiring a manual reload.
      const t = setTimeout(() => router.refresh(), 3000);
      return () => clearTimeout(t);
    }
    if (searchParams.get("canceled")) {
      toast.info("Checkout canceled — you have not been charged.");
      router.replace("/billing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleCheckout() {
    setWorking("checkout");
    try {
      const { url } = await api.startCheckout();
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start checkout"
      );
      setWorking(null);
    }
  }

  async function handlePortal() {
    setWorking("portal");
    try {
      const { url } = await api.openPortal();
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not open billing portal"
      );
      setWorking(null);
    }
  }

  const status = profile.subscription_status;
  const trialExpired =
    status === "trial" && new Date(profile.trial_ends_at) <= new Date();
  const locked =
    searchParams.get("locked") === "1" ||
    trialExpired ||
    status === "canceled" ||
    status === "past_due";
  const daysLeft = trialDaysLeft(profile.trial_ends_at);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your DealFlow subscription.
        </p>
      </div>

      {locked && status !== "active" ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Lock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <CardTitle className="text-base">
                {status === "past_due"
                  ? "Your last payment failed"
                  : status === "canceled"
                    ? "Your subscription is canceled"
                    : "Your free trial has ended"}
              </CardTitle>
              <CardDescription>
                {status === "past_due"
                  ? "Update your payment method to regain access to your pipeline."
                  : "Subscribe to DealFlow Pro to pick up right where you left off — all your contacts and outreach history are saved."}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              {PLAN_NAME}
            </CardTitle>
            <StatusBadge status={status} />
          </div>
          <CardDescription>
            {status === "active" && "Thanks for being a subscriber."}
            {status === "trial" &&
              !trialExpired &&
              `Your free trial ends ${format(
                new Date(profile.trial_ends_at),
                "MMMM d, yyyy"
              )} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left).`}
            {status === "trial" && trialExpired && "Your free trial has ended."}
            {status === "canceled" &&
              "Resubscribe any time — your data is safe."}
            {status === "past_due" &&
              "We couldn't charge your card. Update it in the billing portal."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold">
            $15
            <span className="text-base font-normal text-muted-foreground">
              /month
            </span>
          </p>
          <ul className="space-y-2">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex-col gap-2 sm:flex-row">
          {status === "active" ? (
            <Button
              onClick={handlePortal}
              disabled={working !== null}
              className="w-full sm:w-auto"
            >
              {working === "portal" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Manage subscription
            </Button>
          ) : (
            <>
              <Button
                onClick={handleCheckout}
                disabled={working !== null}
                className="w-full sm:w-auto"
              >
                {working === "checkout" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                {status === "canceled" || status === "past_due"
                  ? `Resubscribe — ${PLAN_PRICE}`
                  : `Upgrade to Pro — ${PLAN_PRICE}`}
              </Button>
              {profile.stripe_customer_id ? (
                <Button
                  variant="outline"
                  onClick={handlePortal}
                  disabled={working !== null}
                  className="w-full sm:w-auto"
                >
                  {working === "portal" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Billing portal
                </Button>
              ) : null}
            </>
          )}
        </CardFooter>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Payments are processed securely by Stripe. Cancel anytime from the
        billing portal.
      </p>
    </div>
  );
}

export function BillingView({ profile }: { profile: Profile }) {
  return (
    <React.Suspense fallback={null}>
      <BillingContent profile={profile} />
    </React.Suspense>
  );
}
