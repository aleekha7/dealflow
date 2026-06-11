import { NextRequest, NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/profile — the current user's profile. */
export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ profile: data });
}

/** PATCH /api/profile — update name/school (used by merge tags). */
export async function PATCH(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message ?? "Invalid profile");
  }

  const { data, error: dbError } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single();

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ profile: data });
}
