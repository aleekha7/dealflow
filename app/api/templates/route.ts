import { NextRequest, NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { templateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/templates — list the user's templates. */
export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ templates: data });
}

/** POST /api/templates — create a template. */
export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid template");
  }

  const { data, error: dbError } = await supabase
    .from("templates")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ template: data }, { status: 201 });
}
