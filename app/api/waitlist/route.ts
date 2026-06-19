import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export async function POST(request: Request) {
  try {
    const { email, name } = (await request.json()) as {
      email?: string;
      name?: string;
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    const dataDir = join(process.cwd(), "data");
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const waitlistPath = join(dataDir, "waitlist.json");
    const existing = existsSync(waitlistPath)
      ? (JSON.parse(readFileSync(waitlistPath, "utf8")) as Array<Record<string, unknown>>)
      : [];

    const alreadyRegistered = existing.some(
      (entry) => entry.email === email
    );
    if (alreadyRegistered) {
      return NextResponse.json({
        message: "Du bist bereits angemeldet! Wir melden uns bald.",
      });
    }

    existing.push({
      email,
      name: name || "",
      signedUpAt: new Date().toISOString(),
    });
    writeFileSync(waitlistPath, JSON.stringify(existing, null, 2));

    return NextResponse.json({
      message: "🎉 Danke für deine Anmeldung! Wir halten dich auf dem Laufenden.",
    });
  } catch {
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen. Bitte später nochmal versuchen." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const waitlistPath = join(process.cwd(), "data", "waitlist.json");
    if (!existsSync(waitlistPath)) {
      return NextResponse.json({ count: 0, entries: [] });
    }
    const entries = JSON.parse(
      readFileSync(waitlistPath, "utf8")
    ) as Array<Record<string, unknown>>;
    return NextResponse.json({ count: entries.length, entries });
  } catch {
    return NextResponse.json({ count: 0, entries: [] });
  }
}
