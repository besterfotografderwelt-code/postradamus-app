import { NextResponse } from "next/server";

// ── Setup ──
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const VISION_MODEL = "gpt-4o-mini";
const TEXT_MODEL = "gpt-4o-mini";

const TEMPERATURE = 0.65;
const FREQUENCY_PENALTY = 0.3;
const PRESENCE_PENALTY = 0.2;

const BANNED_WORDS = [
  "unvergesslich", "Inmitten", "magisch", "besondere Momente", "einzigartig",
  "authentisch eingefangen", "perfekter Moment", "zauberhaft", "Traumkulisse",
  "märchenhaft", "blühend", "Pracht", "Herzenssache",
];

const BANNED_PREFIXES = [
  /^\s*(\*\*)?\s*(caption|beschreibung|das bild zeigt|auf dem bild|dieses bild|dieses foto)/i,
];

const CAPTION_STRATEGIES = [
  { id: "micro_observation", desc: "Beginne mit einer kleinen konkreten Beobachtung aus dem Bild." },
  { id: "confident_statement", desc: "Beginne mit einem selbstbewussten Statement." },
  { id: "behind_the_scene", desc: "Schreibe, als würde man einen kleinen Blick hinter den Moment bekommen." },
  { id: "small_luxury_moment", desc: "Beschreibe einen kleinen kostbaren Augenblick im Detail." },
  { id: "question_to_audience", desc: "Baue am Ende eine natürliche Frage an die Leser ein." },
  { id: "quiet_personal_thought", desc: "Beginne mit einem kurzen inneren Gedanken." },
  { id: "contrast_feeling", desc: "Nutze einen Gegensatz zwischen sichtbarer Szene und persönlichem Gefühl." },
  { id: "direct_oneliner", desc: "Erste Zeile kurz und direkt (max 6 Wörter), danach persönlich." },
  { id: "detail_zoom", desc: "Zoome auf ein einziges konkretes Detail und erzähle davon ausgehend." },
  { id: "mood_first", desc: "Beginne mit der Stimmung, nicht mit dem Bildinhalt." },
];

// ── Helpers ──

function pickStrategy(index: number) {
  return CAPTION_STRATEGIES[index % CAPTION_STRATEGIES.length];
}

function validateCaption(caption: string, previousOpenings: string[] = []): string[] {
  const errors: string[] = [];

  // Check banned prefixes
  for (const pattern of BANNED_PREFIXES) {
    if (pattern.test(caption)) {
      errors.push("Caption beginnt mit verbotenem Prefix oder Bildbeschreibung");
      break;
    }
  }

  // Check banned words
  for (const word of BANNED_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(caption)) {
      errors.push(`Verbotenes Wort: ${word}`);
    }
  }

  // Count hashtags
  const hashtags = caption.match(/#[\w\u00C0-\u024F]+/g) || [];
  if (hashtags.length < 8 || hashtags.length > 10) {
    errors.push(`Hashtag-Anzahl: ${hashtags.length} (soll 8-10)`);
  }

  // Count words (without hashtags)
  const words = caption.replace(/#[\w\u00C0-\u024F]+/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 80 || words.length > 120) {
    errors.push(`Wortanzahl: ${words.length} (soll 80-120)`);
  }

  // Check opening similarity
  const opening = caption.split(/[.!?]/)[0].trim().toLowerCase();
  for (const prev of previousOpenings) {
    if (opening && prev && opening === prev) {
      errors.push("Satzanfang identisch mit vorheriger Caption");
      break;
    }
  }

  return errors;
}

function callOpenAI(model: string, messages: Array<Record<string, unknown>>, type: string) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: type === "analyze" ? 600 : 1000, temperature: TEMPERATURE }),
    signal: AbortSignal.timeout(60_000),
  });
}

// ── Main Handler ──

export async function POST(request: Request) {
  if (!OPENAI_KEY) return NextResponse.json({ error: "Kein OpenAI-Key" }, { status: 500 });

  const { imageBase64, onBoardingString, slotIndex, previousOpenings } = await request.json();
  if (!imageBase64) return NextResponse.json({ error: "Kein Bild" }, { status: 400 });

  const strategy = pickStrategy(slotIndex || 0);
  const prevList: string[] = Array.isArray(previousOpenings) ? previousOpenings : [];

  console.log(`[vision] Slot ${slotIndex}, Strategy: ${strategy.id}`);

  try {
    // ── Step 1: Image Analysis ──
    const analyzeRes = await callOpenAI(VISION_MODEL, [
      {
        role: "system",
        content: "Du analysierst Bilder für Instagram-Captions. Gib NUR JSON zurück. Keine Einleitung. Keine Caption."
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64, detail: "high" } },
          {
            type: "text",
            text: `Analysiere dieses Bild. Gib NUR dieses JSON zurück (kein Markdown, kein Code-Block):\n{"scene":"kurze Szene","subject":"Hauptmotiv","mood":"Stimmung","colors":["Farbe1","Farbe2"],"details":["Detail1","Detail2","Detail3"],"captionAngles":["Winkel1","Winkel2","Winkel3"]}\n\nRegeln: Nur sichtbare Fakten, keine poetische Interpretation, keine erfundenen Details.`
          },
        ],
      },
    ], "analyze");

    const analyzePayload = await analyzeRes.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!analyzeRes.ok || !analyzePayload.choices?.[0]?.message?.content) {
      throw new Error(analyzePayload?.error?.message ?? "Analyse fehlgeschlagen");
    }

    let analysis: Record<string, unknown> = {};
    const rawAnalysis = analyzePayload.choices[0].message.content.trim();
    try {
      // Try to parse JSON from response (may have markdown wrapping)
      const jsonMatch = rawAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = { scene: rawAnalysis, subject: "", mood: "", colors: [], details: [], captionAngles: [] };
    }

    console.log(`[vision] Analysis: ${analysis.subject || "(kein subject)"}`);

    // ── Step 2: Caption Generation ──
    const captionRes = await callOpenAI(TEXT_MODEL, [
      {
        role: "system",
        content: `Du schreibst Instagram-Captions für einen Fotografen. Der Fotograf hat das Bild aufgenommen. Schreibe aus Perspektive des Fotografen (er/sie-Beschreibung, nie Ich-Form). Authentisch. Direkt. Kein Kitsch.${onBoardingString ? ` STIL: ${onBoardingString}` : ""}`
      },
      {
        role: "user",
        content: [
          `Schreibe eine Instagram-Caption (80-120 Wörter + 8-10 Hashtags). Perspektive: Fotograf beschreibt den Moment. Keine Ich-Form.`,
          ``,
          `BILDANALYSE: ${JSON.stringify(analysis)}`,
          `STRATEGIE: ${strategy.desc}`,
          prevList.length ? `VERMEIDE diese Satzanfänge: ${prevList.join(" | ")}` : "",
          ``,
          `REGELN:`,
          `- Kein Prefix, kein "Caption:", kein "Das Bild zeigt"`,
          `- Keine Bildbeschreibung von außen`,
          `- Keine verbotenen Wörter: ${BANNED_WORDS.join(", ")}`,
          `- 2-3 Details aus der Analyse einbauen`,
          `- Nicht beginnen mit: Heute, Manchmal, Inmitten, Es gibt, Dieses`,
          `- Am Ende JSON: {"caption":"dein Text mit Hashtags"}`,
        ].filter(Boolean).join("\n"),
      },
    ], "caption");

    const captionPayload = await captionRes.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!captionRes.ok || !captionPayload.choices?.[0]?.message?.content) {
      throw new Error(captionPayload?.error?.message ?? "Caption fehlgeschlagen");
    }

    let caption = "";
    const rawCaption = captionPayload.choices[0].message.content.trim();
    try {
      const jsonMatch = rawCaption.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        caption = parsed.caption || "";
      }
    } catch { /* fall through */ }
    if (!caption) caption = rawCaption;

    console.log(`[vision] Raw caption len: ${caption.length}`);

    // ── Validation & Retry ──
    let errors = validateCaption(caption, prevList);
    let retries = 0;

    while (errors.length > 0 && retries < 2) {
      console.log(`[vision] Retry ${retries + 1}, errors: ${errors.join(", ")}`);

      const retryRes = await callOpenAI(TEXT_MODEL, [
        { role: "system", content: "Du korrigierst Instagram-Captions. Gib NUR das korrigierte JSON zurück." },
        {
          role: "user",
          content: [
            `Die folgende Caption hat Fehler. Korrigiere sie.`,
            `FEHLER: ${errors.join(". ")}`,
            `CAPTION: ${caption}`,
            `STRATEGIE: ${strategy.desc}`,
            `Gib NUR: {"caption":"korrigierte Version"}`,
          ].join("\n"),
        },
      ], "retry");

      const retryPayload = await retryRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      if (retryRes.ok && retryPayload.choices?.[0]?.message?.content) {
        const rawRetry = retryPayload.choices[0].message.content.trim();
        try {
          const jsonMatch = rawRetry.match(/\{[\s\S]*\}/);
          if (jsonMatch) caption = JSON.parse(jsonMatch[0]).caption || caption;
        } catch { /* keep old */ }
      }
      errors = validateCaption(caption, prevList);
      retries++;
    }

    // Final validation passthrough
    if (errors.length > 0) {
      console.log(`[vision] Final errors (soft): ${errors.join(", ")}`);
    }

    console.log(`[vision] Final caption ok, len=${caption.length}`);

    return NextResponse.json({ content: caption, generator: "openai-vision-2step" });
  } catch (e) {
    console.error(`[vision] ERROR:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
