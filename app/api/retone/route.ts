import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type RetoneRequest = {
  summary: string;
  tone: string;
  businessType: string;
  styleProfile?: string;
};

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

function businessLabel(type?: string) {
  const map: Record<string, string> = {
    hochzeitsfotograf: "Hochzeitsfotografie",
    fitness: "Fitness / Coaching",
    restaurant: "Restaurant / Café",
    produktfotograf: "Produktfotografie",
  };
  return map[(type || "sonstiges").trim().toLowerCase()] || type || "Sonstiges";
}

function toneInstruction(tone: string) {
  const t = tone.trim().toLowerCase();
  if (t === "lustig") return "LUSTIG: Humor, locker, Emojis 😄🎉, flapsig und unterhaltsam. Keine ernsten Formulierungen.";
  if (t === "emotional") return "EMOTIONAL: Gefühlvoll, tief, berührend. Warme Sprache, persönliche Stimme.";
  if (t === "motivierend") return "MOTIVIEREND: Antreibend, kraftvoll, energisch. Power-Wörter. 💪";
  if (t === "romantisch") return "ROMANTISCH: Verträumt, zärtlich, sanft. 🤍";
  if (t === "modern") return "MODERN & EDGY: Clean, kurz, selbstbewusst. Englische Einschübe ok. Kein Kitsch.";
  if (t === "kurz") return "KURZ & KNACKIG: Maximal 2-3 Sätze. Kein Füllwort.";
  if (t === "informativ") return "INFORMATIV: Sachlich, erklärend, strukturiert. Fakten statt Floskeln.";
  if (t === "lässig") return "LÄSSIG: Entspannt, natürlich, wie zu einem Freund.";
  return "AUTHENTISCH: Natürlich, ehrlich, ungekünstelt.";
}

function normalizeHashtags(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
      .map((item) => item.startsWith("#") ? item : `#${item.replace(/^#+/, "")}`).join(" ");
  }
  return "";
}

function safeJsonParse<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]) as T; } catch { return null; }
  }
}

function readChatText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const r = payload as { choices?: Array<{ message?: { content?: unknown } }> };
  const c = r.choices?.[0]?.message?.content;
  return typeof c === "string" ? c.trim() : "";
}

export async function POST(request: Request) {
  let body: RetoneRequest;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!body.summary || !body.tone) {
    return NextResponse.json({ error: "Summary oder Tone fehlt." }, { status: 400 });
  }

  const branche = businessLabel(body.businessType);
  const ti = toneInstruction(body.tone);

  const prompt = [
    `Branche: ${branche}`,
    `Tonalität: ${ti}`,
    ...(body.styleProfile ? [`Stil des Nutzers: ${body.styleProfile}`] : []),
    "",
    "Du bekommst eine Bildbeschreibung. Schreibe daraus eine komplett neue Instagram-Caption im angegebenen Ton.",
    "Keine Fotografie-Sprache! Schreibe aus Unternehmenssicht.",
    "Die Caption soll 50 bis 90 Wörter haben.",
    "Gib 8 bis 14 passende Hashtags zurück.",
    "",
    `Bildbeschreibung: ${body.summary}`,
    "",
    'Antworte AUSSCHLIESSLICH als JSON:',
    '{"caption": "...", "hashtags": "#tag1 #tag2 ..."}'
  ].join("\n");

  // Try DeepSeek first (cheapest)
  const dsKey = readLocalEnvValue("DEEPSEEK_API_KEY");
  if (dsKey) {
    try {
      const baseUrl = (readLocalEnvValue("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").replace(/\/$/, "");
      const model = readLocalEnvValue("DEEPSEEK_MODEL") || "deepseek-v4-flash";
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${dsKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `Du bist ein präziser Social-Media-Texter. Schreibe aus Sicht eines Unternehmens der Branche: ${branche}. Keine Fotografie-Sprache.` },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(12_000)
      });
      const payload: unknown = await res.json();
      if (res.ok) {
        const text = readChatText(payload);
        const parsed = safeJsonParse<{ caption?: string; hashtags?: unknown }>(text);
        if (parsed?.caption) {
          return NextResponse.json({ caption: parsed.caption.trim(), hashtags: normalizeHashtags(parsed.hashtags) });
        }
      }
    } catch { /* fall through to OpenAI */ }
  }

  // Try OpenAI (cheapest model, no vision needed)
  const oaKey = readLocalEnvValue("OPENAI_API_KEY");
  if (oaKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${oaKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Du bist ein präziser Social-Media-Texter für ${branche}. Keine Fotografie-Sprache.` },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
        signal: AbortSignal.timeout(12_000)
      });
      const payload: unknown = await res.json();
      if (res.ok) {
        const text = readChatText(payload);
        const parsed = safeJsonParse<{ caption?: string; hashtags?: unknown }>(text);
        if (parsed?.caption) {
          return NextResponse.json({ caption: parsed.caption.trim(), hashtags: normalizeHashtags(parsed.hashtags) });
        }
      }
    } catch { /* fall through to error */ }
  }

  return NextResponse.json({ error: "Text-Regenerierung fehlgeschlagen." }, { status: 502 });
}
