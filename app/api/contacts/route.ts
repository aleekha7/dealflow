import { NextRequest, NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { STAGES, TIERS } from "@/lib/constants";
import { contactSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/contacts?q=&tier=&stage= — list the user's contacts. */
export async function GET(request: NextRequest) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const tier = params.get("tier");
  const stage = params.get("stage");

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (q) {
    // Escape PostgREST or() syntax characters from user input
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) {
      query = query.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,firm.ilike.%${safe}%`
      );
    }
  }
  if (tier && (TIERS as string[]).includes(tier)) {
    query = query.eq("tier", tier);
  }
  if (stage && (STAGES as string[]).includes(stage)) {
    query = query.eq("pipeline_stage", stage);
  }

  const { data, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ contacts: data });
}

/** POST /api/contacts — create a contact. */
export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid contact");
  }

  const { data, error: dbError } = await supabase
    .from("contacts")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ contact: data }, { status: 201 });
}
