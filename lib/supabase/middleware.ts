import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, publicKey } = getSupabaseConfig();
  const supabase = createServerClient<Database>(url, publicKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  let user: Database["public"]["Tables"]["profiles"]["Row"] | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data?.user ?? null;
  } catch {
    // getUser() failed (timeout/network) – treat as unauthenticated
    user = null;
  }
  const pathname = request.nextUrl.pathname;
  const publicRoutes = ["/", "/login", "/logout", "/auth", "/api", "/preise", "/kundenbereich", "/kontakt", "/faq", "/agb", "/impressum", "/datenschutz", "/cookies"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    const redirectResponse = NextResponse.redirect(homeUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // Check trial/plan for protected routes
  const protectedRoutes = ["/projects", "/settings", "/onboarding"];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (user && isProtected) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_end")
        .single();

      const hasActivePlan = profile && (
        (profile.plan === "trial" && profile.trial_end && new Date(profile.trial_end) > new Date())
        || ["starter", "growth", "studio"].includes(profile.plan ?? "")
      );

      if (!hasActivePlan) {
        const preiseUrl = request.nextUrl.clone();
        preiseUrl.pathname = "/preise";
        preiseUrl.search = "";
        return NextResponse.redirect(preiseUrl);
      }
    } catch {
      // Profile query failed – allow through
    }
  }

  return response;
}
