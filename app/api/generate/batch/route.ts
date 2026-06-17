import { NextResponse } from "next/server";

const businessLabels: Record<string, string> = {
  hochzeitsfotograf: "eine Hochzeitsfotografin",
  restaurant: "ein Restaurant",
  fitness: "ein Fitnessstudio",
  mode: "ein Mode-Label",
  hotel: "ein Hotel",
  immobilien: "eine Immobilienagentur",
  handwerk: "einen Handwerksbetrieb",
  portraitfotograf: "eine Portraitfotografin",
  produktfotograf: "eine Produktfotografin",
  reise: "einen Reiseanbieter",
  kunst: "eine Künstlerin",
  sonstiges: "ein Unternehmen",
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

  const styList = [
    "Sachlich & informierend",
    "Emotional & nahbar",
    "Humorvoll & leicht",
    "Dramatisch & kraftvoll",
    "Minimalistisch & clean",
    "Fragend & neugierig",
    "Storytelling & bildhaft",
    "Direkt & ehrlich",
    "Poetisch & atmosphärisch",
    "Motivierend & aufbauend",
  ];

  const styleAssignments = Array.from({ length: count }, (_, i) => styList[i % styList.length]);

  const prompt = [
    `DU BIST ${count} VERSCHIEDENE PERSONEN. Jede Person hat einen EIGENEN Schreibstil.`,
    `Branche: ${businessLabel}. Projekt: ${project?.couple_name || project?.businessName || "Kundenprojekt"}.`,
    `Grundtonalität: ${tone || "natürlich"}.`,
    ``,
    `JEDE Person schreibt GENAU EINE Instagram-Caption (80-120 Wörter + 8-10 Hashtags).`,
    `Die Personen und ihre Stile:`,
    ...styleAssignments.map((s, i) => `Person ${i + 1}: ${s}.`),
    ``,
    `BILDINFORMATIONEN:\n${imageList}`,
    ``,
    `KRITISCHE REGELN – Bei Verstoß sind ALLE Captions ungültig:`,
    `1. Jede Person schreibt KOMPLETT ANDERS. Wenn zwei Captions ähnlich klingen = FEHLER.`,
    `2. KEINE Person verwendet Wörter oder Satzanfänge einer anderen Person.`,
    `3. IMMER in ICH-Form schreiben (ich, mein, mir). NIE "wir" oder "uns".`,
    `4. VERBOTENE Anfänge: "Inmitten", "Ein Tag", "Wenn", "Es ist", "Man".`,
    `5. Jede Caption MUSS anders anfangen – Frage, Ausruf, Statement, Beobachtung, Zahl, Zitat…`,
    `6. Jeder Text klingt, als hätte ihn ein ECHTER Mensch geschrieben, keine KI.`,
    ...(styleProfile ? [`7. Zusätzlicher Stil des Accounts: ${styleProfile}`] : []),
    ``,
    `AUSGABE-FORMAT:`,
    `Caption 1: [Text Person 1]`,
    `Caption 2: [Text Person 2]`,
    `usw.`,
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
            {
              role: "system",
              content: `Du simulierst ${count} verschiedene Personen. Jede hat einen eigenen Schreibstil. Du schreibst IMMER in der ICH-Form. Jeder Text ist einzigartig. Branche: ${businessLabel}.`
            },
            { role: "user", content: prompt },
          ],
          max_tokens: Math.min(5000, count * 500),
          temperature: 1.3,
        }),
        signal: AbortSignal.timeout(90_000),
      }
    );

    const payload = await res.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!res.ok) throw new Error(payload?.error?.message ?? "API-Fehler");

    const raw = payload.choices?.[0]?.message?.content ?? "";
    const captions: string[] = [];
    const parts = raw.split(/Caption \d+:/i);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) captions.push(trimmed);
    }

    return NextResponse.json({ captions });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
