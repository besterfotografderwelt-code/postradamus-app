import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

type ImageMetadata = {
  id: string;
  name: string;
  tags: string[];
  isFavorite: boolean;
};

type AnalyzeMetadata = {
  businessType?: string;
  tone?: string;
  slotId?: string;
  slotType?: string;
  slotDescription?: string;
  images?: ImageMetadata[];
  styleProfile?: string;
};

type AnalyzeResult = {
  caption: string;
  hashtags: string;
  summary: string;
  generator: "openai-vision" | "deepseek-metadata" | "metadata";
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

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function normalizeBusinessType(value?: string) {
  return (value || "sonstiges").trim().toLowerCase();
}

function normalizeHashtags(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .map((item) => item.startsWith("#") ? item : `#${item.replace(/^#+/, "")}`)
      .join(" ");
  }
  return "";
}

function readChatCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function fallbackFromMetadata(metadata: AnalyzeMetadata): AnalyzeResult {
  const businessType = normalizeBusinessType(metadata.businessType);
  const images = metadata.images ?? [];
  const tags = Array.from(new Set(images.flatMap((image) => image.tags)));
  const names = images
    .map((image) => image.name.replace(/\.[^.]+$/, ""))
    .filter(Boolean);
  const focus = tags.slice(0, 3).join(", ") || names.slice(0, 2).join(", ") || "dieser Moment";
  const isWedding = businessType === "hochzeitsfotograf";
  const isProduct = businessType === "produktfotograf";
  const isRestaurant = businessType === "restaurant";
  const isFitness = businessType === "fitness";

  const caption = isWedding
    ? `Dieses Bild lebt von ${focus}. Genau solche Details und Zwischenmomente machen die Geschichte greifbar, weil sie nicht nur zeigen, was passiert ist, sondern wie sich der Tag angefühlt hat.`
    : isProduct
      ? `Hier zählt der erste Eindruck: ${focus}. Die Aufnahme setzt das Produkt klar in Szene und gibt genug Raum für Form, Material und Wirkung.`
      : isRestaurant
        ? `Man sieht sofort, worum es geht: ${focus}. Die Aufnahme bringt Atmosphäre, Handwerk und Genuss zusammen, ohne den Moment zu überladen.`
        : isFitness
          ? `Dieses Bild zeigt ${focus} nicht als leere Pose, sondern als sichtbaren Fortschritt. Genau so wirkt Training ehrlich, direkt und motivierend.`
          : `Dieses Bild funktioniert über ${focus}. Die Szene wirkt klar, nah und konkret genug, um im Feed nicht generisch zu verschwinden.`;

  const hashtags = isWedding
    ? "#hochzeitsfotografie #echtemomente #hochzeitsreportage #storytelling #hochzeitsbilder #brautpaar #hochzeitsinspiration"
    : isProduct
      ? "#produktfotografie #produktfoto #branding #ecommerce #detailaufnahme #visuals #contentcreation"
      : isRestaurant
        ? "#restaurant #gastro #foodfotografie #genuss #küche #restaurantmarketing #contentcreation"
        : isFitness
          ? "#fitness #training #fitnessmotivation #coaching #progress #workout #contentcreation"
          : "#contentcreation #branding #businessfotografie #storytelling #sichtbarkeit #visuals #marketing";

  return {
    caption,
    hashtags,
    summary: `Lokaler Fallback aus Tags/Dateinamen: ${focus}`,
    generator: "metadata"
  };
}

async function generateDeepSeekMetadataFallback(
  metadata: AnalyzeMetadata,
  reason: string
): Promise<AnalyzeResult | null> {
  const apiKey = readLocalEnvValue("DEEPSEEK_API_KEY");
  if (!apiKey) return null;

  const model = readLocalEnvValue("DEEPSEEK_MODEL") || "deepseek-v4-flash";
  const baseUrl = (readLocalEnvValue("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").replace(/\/$/, "");
  const metadataFallback = fallbackFromMetadata(metadata);

  const prompt = [
    "Schreibe eine Instagram-Caption auf Deutsch.",
    "Du bekommst KEIN Bild, sondern nur Tags und Dateinamen. Schreibe so spezifisch wie möglich auf Basis der Metadaten, ohne Bilddetails zu erfinden.",
    "Die Caption soll 50 bis 85 Wörter haben, natürlich klingen und keine KI-Floskeln enthalten.",
    "Gib 8 bis 14 passende Hashtags zurück.",
    "Antworte ausschließlich als JSON mit den Keys caption, hashtags und summary.",
    "",
    `Branche: ${metadata.businessType || "sonstiges"}`,
    `Tonalität: ${metadata.tone || "authentisch"}`,
    `Post-Typ: ${metadata.slotType || "single"}`,
    `Inhaltlicher Winkel: ${metadata.slotDescription || metadata.slotId || "passend zum sichtbaren Motiv"}`,
    ...(metadata.styleProfile ? [`Schreibstil des Nutzers: ${metadata.styleProfile}`] : []),
    `Bildmetadaten: ${JSON.stringify(metadata.images ?? [])}`,
    `Fallback-Grund: ${reason}`
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Du bist ein präziser Social-Media-Texter. Antworte nur mit gültigem JSON. Keine Bilddetails erfinden, die nicht in den Metadaten stehen. Schreibe aus Sicht des Unternehmens, nicht aus Sicht eines Fotografen. KEINE Fotografie-Fachsprache."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(15_000)
    });

    const payload: unknown = await response.json();
    if (!response.ok) return null;

    const content = readChatCompletionText(payload);
    const parsed = safeJsonParse<Partial<AnalyzeResult> & { hashtags?: unknown }>(content);
    const hashtags = normalizeHashtags(parsed?.hashtags);
    if (!parsed?.caption) return null;

    return {
      caption: parsed.caption.trim(),
      hashtags: hashtags || metadataFallback.hashtags,
      summary: typeof parsed?.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "DeepSeek-Fallback aus Tags und Dateinamen.",
      generator: "deepseek-metadata"
    };
  } catch {
    return null;
  }
}

async function fileToPreviewDataUrl(file: File) {
  const original = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(original)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  return `data:image/jpeg;base64,${resized.toString("base64")}`;
}

function businessLabel(type?: string) {
  const map: Record<string, string> = {
    hochzeitsfotograf: "Hochzeitsfotografie",
    portraitfotograf: "Portraitfotografie",
    produktfotograf: "Produktfotografie",
    fitness: "Fitness / Coaching",
    restaurant: "Restaurant / Café",
    immobilien: "Immobilien",
    handwerk: "Handwerk",
    mode: "Mode / Beauty",
    hotel: "Hotel / Unterkunft",
    reise: "Reise / Travel",
    kunst: "Kunst / Kreativ",
  };
  return map[(type || "sonstiges").trim().toLowerCase()] || "Sonstiges";
}

async function analyzeWithOpenAIVision(
  files: File[],
  metadata: AnalyzeMetadata
): Promise<AnalyzeResult> {
  const apiKey = readLocalEnvValue("OPENAI_API_KEY");
  const model = readLocalEnvValue("OPENAI_VISION_MODEL") || "gpt-4o-mini";
  const branche = businessLabel(metadata.businessType);

  // Only send 1 image for fastest analysis
  const imageContents = await Promise.all(
    files.slice(0, 1).map(async (file) => ({
      type: "image_url" as const,
      image_url: {
        url: await fileToPreviewDataUrl(file),
        detail: "low" as const
      }
    }))
  );

  const toneInstruction = (() => {
    const t = (metadata.tone || "").trim().toLowerCase();
    if (t === "lustig") return "Tonalität: LUSTIG. Schreibe mit Humor, locker, mit Emojis 😄🎉, darf flapsig und unterhaltsam sein. Keine ernsten oder gefühlvollen Formulierungen.";
    if (t === "emotional") return "Tonalität: EMOTIONAL. Schreibe gefühlvoll, tief, berührend. Sprich das Herz an, verwende warme Bilder und eine persönliche, nahbare Stimme.";
    if (t === "motivierend") return "Tonalität: MOTIVIEREND. Schreibe antreibend, kraftvoll, mit Energie. Verwende Power-Wörter wie 'schaffen', 'wachsen', 'stärker', 'Ziel', 'Disziplin'. 💪";
    if (t === "romantisch") return "Tonalität: ROMANTISCH. Schreibe verträumt, zärtlich, mit Liebe zum Detail. Sanfte Sprache, Herzen und Gefühl. 🤍";
    if (t === "modern") return "Tonalität: MODERN & EDGY. Schreibe clean, kurz, selbstbewusst. Englische Einschübe ok. Kein Kitsch, kein Pathos. Cool und direkt.";
    if (t === "kurz") return "Tonalität: KURZ & KNACKIG. Maximal 2-3 Sätze. Auf den Punkt, kein Füllwort, kein Blabla. Jedes Wort muss sitzen.";
    if (t === "informativ") return "Tonalität: INFORMATIV. Schreibe sachlich, erklärend, mit Mehrwert. Strukturiert, klar, ohne Übertreibung. Fakten statt Floskeln.";
    if (t === "lässig") return "Tonalität: LÄSSIG. Schreibe entspannt, natürlich, wie zu einem Freund. Kein Business-Sprech, kein Verkaufen, einfach echt und locker.";
    return "Tonalität: AUTHENTISCH. Schreibe natürlich, ehrlich und ungekünstelt. Keine Übertreibung, kein Marketing-Gelaber.";
  })();

  const systemPrompt = [
    `Du schreibst Social-Media-Texte für ein Unternehmen der Branche: ${branche}.`,
    `Schreibe AUSSCHLIESSLICH aus Sicht dieses Unternehmens, NICHT aus Sicht eines Fotografen.`,
    `Verwende KEINE Begriffe wie "Aufnahme", "Bild", "Foto", "Licht", "Perspektive", "Komposition" oder ähnliche Fotografie-Fachsprache.`,
    `Beschreibe stattdessen, was im Bild zu sehen ist: Menschen, Orte, Produkte, Stimmung, Aktion.`,
    "Analysiere das Bild visuell, bevor du schreibst.",
    "Die Caption soll 50 bis 90 Wörter haben, hochwertig und konkret sein.",
    "Gib 8 bis 14 passende Hashtags zurück.",
    ""
  ].join("\n");

  const userPrompt = [
    toneInstruction,
    `Branche: ${branche}`,
    `Post-Typ: ${metadata.slotType || "single"}`,
    `Inhaltlicher Winkel: ${metadata.slotDescription || metadata.slotId || "passend zum sichtbaren Motiv"}`,
    ...(metadata.styleProfile ? [`Stil des Nutzers: ${metadata.styleProfile}`] : []),
    "",
    "Schreibe eine Instagram-Caption, die zum sichtbaren Bildinhalt und zur Branche passt.",
    "Die gewählte Tonalität muss in Wortwahl, Satzlänge, Rhythmus und Haltung deutlich erkennbar sein.",
    "Vermeide austauschbare Einstiege und allgemeine Social-Media-Floskeln.",
    "Nutze mindestens zwei konkrete sichtbare Details, damit sich die Caption klar von anderen Posts unterscheidet.",
    "Keine Fotografie-Sprache! Schreibe aus Unternehmenssicht.",
    'Antworte AUSSCHLIESSLICH mit diesem JSON:',
    '{"caption": "...", "hashtags": "#tag1 #tag2 ...", "summary": "was sichtbar ist"}'
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            ...imageContents
          ]
        }
      ],
      max_tokens: 600,
      temperature: 0.9,
      response_format: { type: "json_object" }
    }),
    signal: AbortSignal.timeout(25_000)
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const err = payload as { error?: { message?: string } };
    throw new Error(err.error?.message || "OpenAI Vision fehlgeschlagen.");
  }

  const content = readChatCompletionText(payload);
  const parsed = safeJsonParse<Partial<AnalyzeResult> & { hashtags?: unknown }>(content);
  const hashtags = normalizeHashtags(parsed?.hashtags);

  if (!parsed?.caption || !hashtags) {
    throw new Error("OpenAI Vision hat keine verwertbare Caption geliefert.");
  }

  return {
    caption: parsed.caption.trim(),
    hashtags,
    summary: parsed.summary?.trim() || "Bildanalyse abgeschlossen.",
    generator: "openai-vision"
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, 3);
  const metadata = safeJsonParse<AnalyzeMetadata>(String(formData.get("metadata") ?? "")) ?? {};

  if (files.length === 0) {
    return NextResponse.json({ error: "Keine Bilder zur Analyse erhalten." }, { status: 400 });
  }

  // 1. OpenAI Vision (gpt-4o-mini) – sieht Bilder, schreibt echte Captions
  const openaiKey = readLocalEnvValue("OPENAI_API_KEY");
  if (openaiKey) {
    try {
      const result = await analyzeWithOpenAIVision(files, metadata);
      return NextResponse.json(result satisfies AnalyzeResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bildanalyse fehlgeschlagen.";
      // Fallback to DeepSeek if OpenAI fails
      const deepSeekFallback = await generateDeepSeekMetadataFallback(metadata, `OpenAI-Fehler: ${message}`);
      if (deepSeekFallback) {
        return NextResponse.json(deepSeekFallback satisfies AnalyzeResult);
      }
      return NextResponse.json({
        ...fallbackFromMetadata(metadata),
        summary: `OpenAI Vision nicht erreichbar: ${message}`
      } satisfies AnalyzeResult);
    }
  }

  // 2. DeepSeek metadata fallback (keine Vision, nur Tags/Dateinamen)
  const deepSeekFallback = await generateDeepSeekMetadataFallback(metadata, "OPENAI_API_KEY fehlt.");
  if (deepSeekFallback) {
    return NextResponse.json(deepSeekFallback satisfies AnalyzeResult);
  }

  // 3. Lokaler Fallback
  return NextResponse.json({
    ...fallbackFromMetadata(metadata),
    summary: "Lokaler Fallback aus Tags und Dateinamen. Für bessere Captions OPENAI_API_KEY oder DEEPSEEK_API_KEY setzen."
  } satisfies AnalyzeResult);
}
