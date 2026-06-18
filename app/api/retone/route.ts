import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { captionStyleContract, styleContrastRule } from "@/lib/caption-style";

type RetoneRequest = {
  summary: string;
  tone: string;
  businessType: string;
  styleProfile?: string;
  previousCaptions?: string[];
  variationIndex?: number;
  includeCta?: boolean;
};

const variationInstructions = [
  "Beginne mit einer konkreten Beobachtung, nicht mit einer Frage.",
  "Beginne mit einer kurzen, unerwarteten Aussage und variiere die Satzlängen.",
  "Beginne mit einer natürlichen Frage an die Community.",
  "Erzähle eine kleine Szene mit Handlung statt einer allgemeinen Stimmung.",
  "Beginne mit einem konkreten Detail und leite daraus einen Gedanken ab.",
  "Baue die Caption als Kontrast auf.",
  "Steige ohne Einleitung mitten in die Handlung ein."
];

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
  const prompt = [
    `Branche: ${branche}`,
    captionStyleContract(body),
    styleContrastRule(body.tone),
    variationInstructions[Math.abs(body.variationIndex ?? 0) % variationInstructions.length],
    body.includeCta
      ? "Beende mit einem kurzen, natürlichen CTA, der zum Inhalt passt."
      : "Beende ohne CTA mit einem eigenständigen Gedanken.",
    "",
    "Du bekommst eine Bildbeschreibung. Schreibe daraus eine komplett neue Instagram-Caption im angegebenen Ton.",
    "Schreibe von Grund auf neu. Ein bloßer Austausch einzelner Adjektive erfüllt den Stilwechsel nicht.",
    "Übernimm keine Formulierungen aus einer vorherigen Caption und vermeide generische Einstiege.",
    "Vermeide Floskeln wie „inmitten von“, „mehr als nur“, „genau solche“, „magischer Moment“ und „für die Ewigkeit“.",
    ...((body.previousCaptions ?? []).length > 0
      ? [
          "Bereits erzeugte Captions – keine Formulierungen oder Satzmuster daraus wiederverwenden:",
          ...(body.previousCaptions ?? []).slice(-6).map((caption, index) => `${index + 1}. ${caption}`)
        ]
      : []),
    "Keine Fotografie-Sprache! Schreibe aus Unternehmenssicht.",
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
          temperature: 0.9
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
          temperature: 0.9,
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
