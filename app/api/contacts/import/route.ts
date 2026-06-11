import { NextRequest, NextResponse } from "next/server";

import { jsonError, requireUser } from "@/lib/api";
import { csvImportSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/contacts/import — bulk import contacts parsed from a CSV.
 * Body: { contacts: ContactInput[] } (the client parses the CSV file with
 * papaparse and maps rows to contact fields).
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

  const parsed = csvImportSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const rowInfo =
      typeof first?.path?.[1] === "number" ? ` (row ${first.path[1] + 1})` : "";
    return jsonError(`${first?.message ?? "Invalid import data"}${rowInfo}`);
  }

  const rows = parsed.data.contacts.map((c) => ({ ...c, user_id: user.id }));

  const { data, error: dbError } = await supabase
    .from("contacts")
    .insert(rows)
    .select("id");

  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({ imported: data?.length ?? 0 }, { status: 201 });
}
