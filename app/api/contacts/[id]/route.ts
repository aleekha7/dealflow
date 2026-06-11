import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireUser } from "@/lib/api";
import { STAGE_NOTES, STAGE_TO_ACTION } from "@/lib/constants";
import { contactUpdateSchema } from "@/lib/validation";
import type { PipelineStage } from "@/types";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

/** GET /api/contacts/:id */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!idSchema.safeParse(params.id).success) {
    return jsonError("Invalid contact id");
  }

  const { data, error: dbError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Contact not found", 404);

  return NextResponse.json({ contact: data });
}

/**
 * PATCH /api/contacts/:id — update a contact.
 * When the pipeline stage changes to an outreach stage, an outreach log
 * entry is recorded automatically (which also bumps last_action_at).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;
  if (!idSchema.safeParse(params.id).success) {
    return jsonError("Invalid contact id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = contactUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid update");
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonError("No fields to update");
  }

  // RLS limits this to the user's own contacts; .maybeSingle() catches
  // attempts to touch someone else's record (returns null).
  const { data: existing, error: fetchError } = await supabase
    .from("contacts")
    .select("id, pipeline_stage")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) return jsonError(fetchError.message, 500);
  if (!existing) return jsonError("Contact not found", 404);

  const { data: updated, error: updateError } = await supabase
    .from("contacts")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) return jsonError(updateError.message, 500);

  // Auto-log stage transitions so the outreach log stays the source of truth
  const newStage = parsed.data.pipeline_stage as PipelineStage | undefined;
  if (newStage && newStage !== existing.pipeline_stage) {
    const action = STAGE_TO_ACTION[newStage];
    if (action) {
      const { error: logError } = await supabase.from("outreach_log").insert({
        user_id: user.id,
        contact_id: params.id,
        action_type: action,
        note: STAGE_NOTES[newStage] ?? "",
      });
      if (logError) return jsonError(logError.message, 500);
    }
  }

  return NextResponse.json({ contact: updated });
}

/** DELETE /api/contacts/:id */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!idSchema.safeParse(params.id).success) {
    return jsonError("Invalid contact id");
  }

  const { error: dbError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", params.id);

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ success: true });
}
