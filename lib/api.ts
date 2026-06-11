import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user for an API route. Returns the RLS-scoped
 * Supabase client plus the user, or a ready-made 401 response.
 */
export async function requireUser(): Promise<
  | { supabase: ReturnType<typeof createClient>; user: User; error: null }
  | { supabase: null; user: null; error: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase: null,
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { supabase, user, error: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
