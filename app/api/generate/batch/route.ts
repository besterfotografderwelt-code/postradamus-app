import { NextResponse } from "next/server";

const businessLabels: Record<string, string> = {
  hochzeitsfotograf: "eine Hochzeitsfotografin",
  restaurant: "ein Restaurant", fitness: "ein Fitnessstudio", mode: "ein Mode-Label",
  hotel: "ein Hotel", immobilien: "eine Immobilienagentur", handwerk: "einen Handwerksbetrieb",
  portraitfotograf: "eine Portraitfotografin", produktfotograf: "eine Produktfotografin",
  reise: "einen Reiseanbieter", kunst: "eine Künstlerin", sonstiges: "ein Unternehmen",
};

export async function POST(request: Request) {
  const { images, project, tone, businessType, styleProfile } = await request.json();
  const businessLabel = businessLabels[businessType] ?? "ein Unternehmen";
  const count = Math.min((images || []).length, 30);

  const imageList = (images || [])
    .map((img: { filename?: string; tags?: string[] }, i: number) =>
      `Bild ${i + 1}: ${img.filename ?? `#${i + 1}`} (Tags: ${(img.tags ?? []).join(", ") || "keine"})`
    )
    .join("\n");

  const angles = [
    "der entscheidende Moment, der alles verändert hat",
    "das kleine Detail, das kaum jemand bemerkt",
    "die Stimmung zwischen den großen Ereignissen",
    "was VOR diesem Bild passiert ist",
    "was NACH diesem Bild passiert ist",
    "was ich dabei gedacht habe",
    "warum genau DIESES Bild mein Favorit ist",
    "was der Kunde dazu gesagt hat",
    "die größte Herausforderung bei diesem Shot",
    "ein lustiger Moment hinter den Kulissen",
    "das Licht, das alles perfekt gemacht hat",
    "warum ich diesen Ort liebe",
    "der Augenblick, den man nicht planen kann",
    "was dieses Bild für die ganze Serie bedeutet",
  ];

  const prompt = [
    `Du schreibst ${count} Instagram-Captions für ${businessLabel}.`,
    `Projekt: ${project?.couple_name || project?.businessName || "Kundenprojekt"}.`,
    `Stil-Vorgabe: ${styleProfile || "Authentisch, persönlich, nahbar"}. Tonalität: ${tone || "natürlich"}.`,
    ``,
    'WICHTIG: ALLE Captions klingen nach DERSELBEN Person (konsistenter Stil).',
    'Aber JEDE Caption hat einen KOMPLETT ANDEREN INHALT und eine andere Perspektive:',
    ...angles.slice(0, count).map((a, i) => `${i + 1}. Dein Fokus: ${a}`),
    ``,
    `BILDINFORMATIONEN:\n${imageList}`,
    ``,
    `REGELN:`,
    `- Immer ICH-Form (ich, mein, mir), niemals WIR`,
    `- Jede Caption: 80-120 Wörter + 8-10 Hashtags`,
    `- Keine Floskeln, keine Phrasen, kein "Inmitten von"`,
    `- Schreib wie ein Mensch, nicht wie eine KI`,
    `- Jede Caption klingt, als wäre das Bild gerade erst entstanden`,
    ``,
    `Format: "Caption 1:" dann Text, "Caption 2:" dann Text, usw.`,
  ].join("\n");

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Kein API-Key" }, { status: 500 });

  const isDeepseek = !process.env.OPENAI_API_KEY;

  try {
    const res = await fetch(
      isDeepseek
        ? `${(process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "")}/chat/completions`
        : "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: isDeepseek ? (process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash") : (process.env.OPENAI_MODEL ?? "gpt-5.4-mini"),
          messages: [
            { role: "system", content: `Du bist Social-Media-Texter für ${businessLabel}. Dein Stil: ${styleProfile || "authentisch, persönlich"}. Du schreibst IMMER in ICH-Form. Deine Texte klingen wie von einem echten Menschen – nahbar, ehrlich, unverwechselbar.` },
            { role: "user", content: prompt },
          ],
          max_tokens: Math.min(5000, count * 500),
          temperature: 0.9,
          frequency_penalty: 1.0,
          presence_penalty: 1.0,
        }),
        signal: AbortSignal.timeout(90_000),
      }
    );

    const payload = await res.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!res.ok) throw new Error(payload?.error?.message ?? "API-Fehler");

    const raw = payload.choices?.[0]?.message?.content ?? "";
    const captions: string[] = [];
    const parts = raw.split(/Caption \d+:/i);
    for (const part of parts) { const t = part.trim(); if (t) captions.push(t); }

    return NextResponse.json({ captions });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
