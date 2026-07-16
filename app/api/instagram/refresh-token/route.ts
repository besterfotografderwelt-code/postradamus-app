import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { graphApiUrl } from "@/lib/app-config";

/**
 * Refreshes a long-lived Instagram access token.
 * Long-lived tokens from the Graph API can be refreshed while still valid
 * to get a new 60-day token. This must be called BEFORE the token expires.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { accessToken?: string };
    const fallbackTokenPath = join(process.cwd(), "data", "instagram-token.json");
    const fallbackToken = existsSync(fallbackTokenPath)
      ? (JSON.parse(readFileSync(fallbackTokenPath, "utf8")) as { accessToken?: string }).accessToken?.trim()
      : "";
    const token = body.accessToken?.trim() || fallbackToken;
    if (!token) {
      return NextResponse.json({ error: "Kein Token vorhanden." }, { status: 400 });
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID || "CHANGE_ME";
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || "";

    // Refresh the long-lived token
    const url = new URL(graphApiUrl("/oauth/access_token"));
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("fb_exchange_token", token);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = await res.json();

    if (!res.ok || !data.access_token) {
      return NextResponse.json({
        success: false,
        error: data.error?.message || "Token-Refresh fehlgeschlagen.",
        needsReauth: true
      }, { status: 200 }); // 200 so client can handle gracefully
    }

    // Save refreshed token server-side for auto-refresh
    try {
      const dataDir = join(process.cwd(), "data");
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
      const tokenPath = join(dataDir, "instagram-token.json");
      const existing = existsSync(tokenPath)
        ? JSON.parse(readFileSync(tokenPath, "utf8"))
        : {};
      writeFileSync(tokenPath, JSON.stringify({
        ...existing,
        accessToken: data.access_token,
        refreshedAt: new Date().toISOString()
      }));
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000 // ~60 days
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Refresh fehlgeschlagen.",
      needsReauth: true
    }, { status: 200 });
  }
}
