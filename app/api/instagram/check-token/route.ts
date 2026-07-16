import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { graphApiUrl } from "@/lib/app-config";

function loadServerToken() {
  try {
    const tokenPath = join(process.cwd(), "data", "instagram-token.json");
    if (!existsSync(tokenPath)) return "";
    const data = JSON.parse(readFileSync(tokenPath, "utf8")) as { accessToken?: string };
    return data.accessToken?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { accessToken?: string; autoRefresh?: boolean };
    const token = body.accessToken?.trim() || loadServerToken();
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
        const refreshRes = await fetch(`${request.headers.get("origin") || "http://localhost:3000"}/api/instagram/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token })
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
      } catch {
        // Refresh failed silently - token still valid, just not refreshed
      }
    }

    return NextResponse.json({
      valid: true,
      refreshed: false,
      message: "Token gültig."
    });
  } catch {
    return NextResponse.json({ valid: false, message: "API nicht erreichbar.", action: "retry" });
  }
}
