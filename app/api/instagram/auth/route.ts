import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { graphApiUrl } from "@/lib/app-config";

export async function POST(request: Request) {
  try {
    const { code } = await request.json() as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "Autorisierungscode fehlt." }, { status: 400 });
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID || "CHANGE_ME";
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || "";
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${request.headers.get("origin") || "http://localhost:3000"}/auth/instagram/callback`;

    if (!clientSecret) {
      return NextResponse.json(
        { error: "Instagram App-Geheimcode fehlt. Bitte INSTAGRAM_CLIENT_SECRET in .env.local eintragen und den Dev-Server neu starten." },
        { status: 500 }
      );
    }

    // Exchange code for short-lived access token
    const tokenUrl = new URL(graphApiUrl("/oauth/access_token"));
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), {
      signal: AbortSignal.timeout(10000)
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const metaMessage = tokenData.error?.message || "";
      const secretError = metaMessage.toLowerCase().includes("client secret");
      return NextResponse.json(
        {
          error: secretError
            ? `Instagram App-Geheimcode passt nicht zur App-ID ${clientId}. Bitte den App-Geheimcode aus Meta Developer Portal > App-Einstellungen > Grundlegendes neu eintragen und den Dev-Server neu starten.`
            : metaMessage || "Token-Austausch fehlgeschlagen."
        },
        { status: 502 }
      );
    }

    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const llUrl = new URL(graphApiUrl("/oauth/access_token"));
    llUrl.searchParams.set("grant_type", "fb_exchange_token");
    llUrl.searchParams.set("client_id", clientId);
    llUrl.searchParams.set("client_secret", clientSecret);
    llUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const llRes = await fetch(llUrl.toString(), { signal: AbortSignal.timeout(10000) });
    const llData = await llRes.json();

    const accessToken = llRes.ok && llData.access_token ? llData.access_token : null;
    if (!accessToken) {
      const metaMessage = llData.error?.message || "";
      const secretError = metaMessage.toLowerCase().includes("client secret");
      return NextResponse.json(
        {
          error: secretError
            ? `Instagram App-Geheimcode passt nicht zur App-ID ${clientId}. Bitte den App-Geheimcode aus Meta Developer Portal > App-Einstellungen > Grundlegendes neu eintragen und den Dev-Server neu starten.`
            : "Long-Lived Token konnte nicht erstellt werden. Der Token-Austausch ist fehlgeschlagen. Bitte App-Einstellungen im Meta Developer Portal prüfen."
        },
        { status: 502 }
      );
    }

    // Get Instagram Business Account ID
    let accountId = "";
    let username = "";
    try {
      const accountsUrl = new URL(graphApiUrl("/me/accounts"));
      accountsUrl.searchParams.set("access_token", accessToken);
      const accountsRes = await fetch(accountsUrl.toString(), { signal: AbortSignal.timeout(10000) });
      const accountsData = await accountsRes.json();

      if (accountsData.data?.length > 0) {
        const pageId = accountsData.data[0].id;
        const pageToken = accountsData.data[0].access_token;

        // Get Instagram Business Account connected to this page
        const igUrl = new URL(graphApiUrl(`/${pageId}`));
        igUrl.searchParams.set("fields", "instagram_business_account");
        igUrl.searchParams.set("access_token", pageToken);
        const igRes = await fetch(igUrl.toString(), { signal: AbortSignal.timeout(10000) });
        const igData = await igRes.json();

        if (igData.instagram_business_account?.id) {
          accountId = igData.instagram_business_account.id;

          // Get username
          const userUrl = new URL(graphApiUrl(`/${accountId}`));
          userUrl.searchParams.set("fields", "username");
          userUrl.searchParams.set("access_token", accessToken);
          const userRes = await fetch(userUrl.toString(), { signal: AbortSignal.timeout(10000) });
          const userData = await userRes.json();
          username = userData.username || "";
        }
      }
    } catch {
      // Account ID lookup failed, token is still valid for basic operations
    }

    if (!accountId) {
      try {
        const debugUrl = new URL(graphApiUrl("/debug_token"));
        debugUrl.searchParams.set("input_token", accessToken);
        debugUrl.searchParams.set("access_token", accessToken);
        const debugRes = await fetch(debugUrl.toString(), { signal: AbortSignal.timeout(10000) });
        const debugData = await debugRes.json();
        const scopes = Array.isArray(debugData.data?.granular_scopes)
          ? debugData.data.granular_scopes
          : [];
        const publishScope = scopes.find((scope: { scope?: string; target_ids?: string[] }) =>
          scope.scope === "instagram_content_publish" && Array.isArray(scope.target_ids) && scope.target_ids.length > 0
        );
        const basicScope = scopes.find((scope: { scope?: string; target_ids?: string[] }) =>
          scope.scope === "instagram_basic" && Array.isArray(scope.target_ids) && scope.target_ids.length > 0
        );
        accountId = publishScope?.target_ids?.[0] || basicScope?.target_ids?.[0] || "";
      } catch {
        // Fallback account lookup failed.
      }
    }

    if (!accountId) {
      return NextResponse.json(
        {
          error: "Instagram wurde autorisiert, aber keine postbare Instagram Account ID gefunden. Bitte sicherstellen, dass das Konto ein Business/Creator-Konto ist und die App Zugriff auf dieses Instagram-Konto bekommen hat."
        },
        { status: 502 }
      );
    }

    // Save token server-side for auto-refresh
    try {
      const dataDir = join(process.cwd(), "data");
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
      writeFileSync(join(dataDir, "instagram-token.json"), JSON.stringify({
        accessToken,
        accountId,
        username,
        savedAt: new Date().toISOString()
      }));
    } catch { /* non-critical */ }

    return NextResponse.json({ connected: true, accountId, username });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth fehlgeschlagen." },
      { status: 500 }
    );
  }
}
