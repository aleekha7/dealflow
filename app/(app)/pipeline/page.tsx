import type { Metadata } from "next";

import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school")
    .eq("id", user!.id)
    .single();

  return <KanbanBoard profile={profile ?? { full_name: "", school: "" }} />;
}
