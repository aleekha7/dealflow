import type { Metadata } from "next";

import { TemplatesView } from "@/components/templates/templates-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school")
    .eq("id", user!.id)
    .single();

  return <TemplatesView profile={profile ?? { full_name: "", school: "" }} />;
}
