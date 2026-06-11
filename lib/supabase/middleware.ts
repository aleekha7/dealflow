import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/contacts",
  "/pipeline",
  "/templates",
  "/billing",
  "/settings",
];

const AUTH_PAGES = ["/login", "/signup"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

function hasAccess(profile: {
  subscription_status: string;
  trial_ends_at: string;
}) {
  if (profile.subscription_status === "active") return true;
  if (
    profile.subscription_status === "trial" &&
    new Date(profile.trial_ends_at).getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser —
  // it can cause session refresh bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated users → login (for app pages and app API routes)
  if (!user && (isProtected(pathname) || pathname.startsWith("/api/"))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users don't need the auth pages
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Subscription gate: expired trial / canceled / past_due users can only
  // reach /billing (and the stripe API routes needed to pay).
  if (
    user &&
    isProtected(pathname) &&
    !pathname.startsWith("/billing")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, trial_ends_at")
      .eq("id", user.id)
      .single();

    if (profile && !hasAccess(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = "/billing";
      url.search = "?locked=1";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
