import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BillingView } from "@/components/billing/billing-view";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  return <BillingView profile={profile} />;
}
