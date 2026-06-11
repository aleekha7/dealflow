import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireUser } from "@/lib/api";
import { templateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

/** PATCH /api/templates/:id */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!idSchema.safeParse(params.id).success) {
    return jsonError("Invalid template id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = templateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid update");
  }
  if (Object.keys(parsed.data).length === 0) {
    return jsonError("No fields to update");
  }

  const { data, error: dbError } = await supabase
    .from("templates")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .maybeSingle();

  if (dbError) return jsonError(dbError.message, 500);
  if (!data) return jsonError("Template not found", 404);

  return NextResponse.json({ template: data });
}

/** DELETE /api/templates/:id */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await requireUser();
  if (error) return error;
  if (!idSchema.safeParse(params.id).success) {
    return jsonError("Invalid template id");
  }

  const { error: dbError } = await supabase
    .from("templates")
    .delete()
    .eq("id", params.id);

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ success: true });
}
