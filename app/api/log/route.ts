import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireUser } from "@/lib/api";
import { logEntrySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/log?contact_id= — outreach history for one contact. */
export async function GET(request: NextRequest) {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const contactId = request.nextUrl.searchParams.get("contact_id");
  if (!contactId || !z.string().uuid().safeParse(contactId).success) {
    return jsonError("contact_id is required");
  }

  const { data, error: dbError } = await supabase
    .from("outreach_log")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ log: data });
}

/**
 * POST /api/log — record an interaction. A DB trigger bumps the contact's
 * last_action_at automatically.
 */
export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = logEntrySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid log entry");
  }

  // Verify the contact belongs to this user (RLS would also reject the
  // insert via the FK, but this returns a clean 404 instead of a 500).
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", parsed.data.contact_id)
    .maybeSingle();

  if (!contact) return jsonError("Contact not found", 404);

  const { data, error: dbError } = await supabase
    .from("outreach_log")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ entry: data }, { status: 201 });
}
