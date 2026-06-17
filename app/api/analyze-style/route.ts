import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type AnalyzeStyleRequest = {
  captions: string[];
  businessType: string;
};

type StyleProfile = {
  tone: string;
  sentenceStyle: string;
  address: string;
  emojiDensity: string;
  hashtagStyle: string;
  opener: string;
  closer: string;
  traits: string;
  promptAddition: string;
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

function readChatText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const r = payload as { choices?: Array<{ message?: { content?: unknown } }> };
  const c = r.choices?.[0]?.message?.content;
  return typeof c === "string" ? c.trim() : "";
}

function safeJsonParse<T>(value: string): T | null {
  try { return JSON.parse(value) as T; } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]) as T; } catch { return null; }
  }
}

function buildFallbackProfile(captions: string[]): StyleProfile {
  const joined = captions.join(" ");
  const hasEmojis = /[\p{Emoji}]/u.test(joined);
  const emojiCount = (joined.match(/[\p{Emoji}]/gu) || []).length;
  const usesDu = /\bdu\b/i.test(joined);
  const usesSie = /\bSie\b/.test(joined);
  const hasQuestions = captions.some((c) => c.includes("?"));
  const avgWords = captions.reduce((sum, c) => sum + c.split(/\s+/).length, 0) / captions.length;

  return {
    tone: hasEmojis && avgWords < 30 ? "locker" : "authentisch",
    sentenceStyle: avgWords < 20 ? "sehr kurze Sätze" : avgWords < 40 ? "mittellange Sätze" : "ausführlich",
    address: usesDu ? "Du-Anrede" : usesSie ? "Sie-Anrede" : "neutral",
    emojiDensity: emojiCount > 3 ? "viele Emojis" : hasEmojis ? "gelegentlich Emojis" : "keine Emojis",
    hashtagStyle: "Standard-Hashtags",
    opener: hasQuestions ? "oft mit Frage" : "oft mit Aussage",
    closer: hasQuestions ? "gern mit Frage oder CTA" : "gern mit ruhigem Ausklang",
    traits: "ehrlich, direkt",
    promptAddition: hasEmojis
      ? `Schreibe im Stil des Nutzers: ${usesDu ? "Du-Anrede" : "neutral"}, ${hasEmojis ? "mit passenden Emojis" : "ohne Emojis"}, ${hasQuestions ? "oft mit Fragen" : "aussagekräftig"}, etwa ${Math.round(avgWords)} Wörter.`
      : `Schreibe im Stil des Nutzers: ${usesDu ? "Du-Anrede" : "neutral"}, aussagekräftig, etwa ${Math.round(avgWords)} Wörter.`
  };
}

export async function POST(request: Request) {
  let body: AnalyzeStyleRequest;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const validCaptions = (body.captions || []).filter((c) => c.trim().length > 10).slice(0, 5);
  if (validCaptions.length < 2) {
    return NextResponse.json({ error: "Bitte mindestens 2 aussagekräftige Captions eingeben." }, { status: 400 });
  }

  const prompt = [
    "Analysiere den Schreibstil dieser Instagram-Captions und erstelle ein Stil-Profil.",
    "Antworte AUSSCHLIESSLICH als JSON mit diesen Keys:",
    "",
    "tone: Ein Wort, das den Grundton beschreibt (z.B. locker, professionell, herzlich, sachlich, witzig, motivierend)",
    "sentenceStyle: Satzbau (z.B. kurze Sätze, lange Sätze, gemischt, viele Absätze)",
    "address: Anrede (Du, Sie, neutral, gemischt)",
    "emojiDensity: Emoji-Nutzung (z.B. keine, sparsam, gelegentlich, viele)",
    "hashtagStyle: Hashtag-Verwendung (z.B. am Ende, eingestreut, keine, CamelCase, viele, wenige)",
    "opener: Wie fangen Captions an? (z.B. mit Frage, mit Aussage, mit Emoji, mit Hook)",
    "closer: Wie enden Captions? (z.B. mit Frage, mit CTA, mit Ausklang, mit Emoji)",
    "traits: 3-5 Adjektive, die den Stil beschreiben (z.B. direkt, warm, humorvoll, sachlich, motivierend)",
    "promptAddition: Ein kurzer Prompt-Zusatz (1-2 Sätze auf Deutsch), der einer KI sagt, wie sie im Stil des Nutzers schreiben soll.",
    "",
    "Captions des Nutzers:",
    ...validCaptions.map((c, i) => `${i + 1}. ${c}`),
    "",
    "Wichtig: promptAddition soll präzise sein, z.B. 'Schreibe mit kurzen Sätzen, Du-Anrede, 1-2 Emojis pro Caption. Stell am Ende eine Frage. Keine langen Einleitungen.'"
  ].join("\n");

  // Try DeepSeek first
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
            { role: "system", content: "Du bist ein präziser Stil-Analyst für Social-Media-Texte. Antworte nur mit gültigem JSON." },
            { role: "user", content: prompt }
          ],
          max_tokens: 600,
          temperature: 0.5
        }),
        signal: AbortSignal.timeout(15_000)
      });
      const payload: unknown = await res.json();
      if (res.ok) {
        const text = readChatText(payload);
        const parsed = safeJsonParse<StyleProfile>(text);
        if (parsed?.promptAddition) {
          return NextResponse.json({ profile: parsed, generator: "deepseek" });
        }
      }
    } catch { /* fall through */ }
  }

  // Fallback: local analysis
  const profile = buildFallbackProfile(validCaptions);
  return NextResponse.json({ profile, generator: "local" });
}
