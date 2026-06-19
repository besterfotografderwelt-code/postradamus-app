import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  // Waitlist count
  let waitlistCount = 0;
  try {
    const waitlistPath = join(process.cwd(), "data", "waitlist.json");
    if (existsSync(waitlistPath)) {
      const entries = JSON.parse(readFileSync(waitlistPath, "utf8")) as Array<Record<string, unknown>>;
      waitlistCount = entries.length;
    }
  } catch { /* ignore */ }

  // Instagram token status
  let instagramConnected = false;
  try {
    const tokenPath = join(process.cwd(), "data", "instagram-token.json");
    if (existsSync(tokenPath)) {
      const tokenData = JSON.parse(readFileSync(tokenPath, "utf8")) as { accessToken?: string };
      instagramConnected = Boolean(tokenData.accessToken);
    }
  } catch { /* ignore */ }

  // Environment check
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY || readLocalEnvValue("OPENAI_API_KEY"));
  const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY || readLocalEnvValue("DEEPSEEK_API_KEY"));
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "YOUR_SUPABASE_URL"
  );

  return NextResponse.json({
    waitlistCount,
    instagramConnected,
    hasOpenAI,
    hasDeepSeek,
    hasSupabase,
    apiRoutes: [
      { path: "/api/analyze-post", method: "POST", status: "ready" },
      { path: "/api/retone", method: "POST", status: "ready" },
      { path: "/api/generate", method: "POST", status: "ready" },
      { path: "/api/instagram/post", method: "POST", status: instagramConnected ? "ready" : "needs_auth" },
      { path: "/api/waitlist", method: "POST", status: "ready" },
    ],
  });
}

function readLocalEnvValue(name: string): string {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;

  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return "";

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim() ?? "";
}
