import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authenticated-route";
import { graphApiUrl } from "@/lib/app-config";
import { loadInstagramServerConfig } from "@/lib/instagram-server-config";

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.authenticated) {
      return NextResponse.json({ valid: false, message: "Bitte anmelden.", action: "login" }, { status: 401 });
    }

    const body = await request.json() as { accessToken?: string; autoRefresh?: boolean };
    const serverToken = loadInstagramServerConfig()?.accessToken ?? "";
    const token = body.accessToken?.trim() || serverToken;
    const usedServerToken = !body.accessToken?.trim() && Boolean(serverToken);
    if (!token) {
      return NextResponse.json({ valid: false, message: "Kein Token vorhanden.", action: "reconnect" });
    }

    // Check token validity
    const url = new URL(graphApiUrl("/me/accounts"));
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = await res.json();

    if (!res.ok || !data.data) {
      const errorMsg = data.error?.message || "Token ungültig.";
      const isExpired = errorMsg.includes("expired") || errorMsg.includes("Session");

      if (isExpired || data.error?.code === 190) {
        return NextResponse.json({
          valid: false,
          message: "Token ist abgelaufen. Bitte Instagram neu verbinden.",
          action: "reconnect"
        });
      }

      return NextResponse.json({
        valid: false,
        message: errorMsg,
        action: "reconnect"
      });
    }

    // Token is valid - check if we should try to refresh
    if (body.autoRefresh !== false) {
      try {
        const refreshRes = await fetch(`${new URL(request.url).origin}/api/instagram/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(usedServerToken ? {} : { accessToken: token })
        });
        const refreshData = await refreshRes.json();

        if (refreshData.success && refreshData.accessToken && refreshData.accessToken !== token) {
          return NextResponse.json({
            valid: true,
            refreshed: true,
            accessToken: refreshData.accessToken,
            expiresIn: refreshData.expiresIn || 5184000,
            daysLeft: Math.floor((refreshData.expiresIn || 5184000) / 86400),
            message: "Token wurde automatisch erneuert."
          });
        }
        if (refreshData.success && refreshData.serverManaged) {
          return NextResponse.json({
            valid: true,
            refreshed: true,
            serverManaged: true,
            expiresIn: refreshData.expiresIn || 5184000,
            daysLeft: Math.floor((refreshData.expiresIn || 5184000) / 86400),
            message: "Serverseitiger Token wurde automatisch erneuert."
          });
        }
      } catch {
        // Refresh failed silently - token still valid, just not refreshed
      }
    }

    return NextResponse.json({
      valid: true,
      refreshed: false,
      serverManaged: usedServerToken,
      message: "Token gültig."
    });
  } catch {
    return NextResponse.json({ valid: false, message: "API nicht erreichbar.", action: "retry" });
  }
}
