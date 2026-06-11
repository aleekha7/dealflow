import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and the endpoints that must
     * stay public / unauthenticated:
     *  - /api/stripe/webhook (authenticated by Stripe signature)
     *  - /api/cron (authenticated by CRON_SECRET)
     *  - /auth/callback (email confirmation exchange)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/cron|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
