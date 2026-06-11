import type { Metadata } from "next";

import { ContactsView } from "@/components/contacts/contacts-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school")
    .eq("id", user!.id)
    .single();

  return (
    <ContactsView profile={profile ?? { full_name: "", school: "" }} />
  );
}
