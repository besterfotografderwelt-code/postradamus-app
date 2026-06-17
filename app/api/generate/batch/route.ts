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

  const imageList = (images || [])
    .map((img: { filename?: string; tags?: string[] }, i: number) =>
      `Bild ${i + 1}: ${img.filename ?? `#${i + 1}`} (Tags: ${(img.tags ?? []).join(", ") || "keine"})`
    )
    .join("\n");

  const count = Math.min((images || []).length, 30);
  const prompt = [
    `Du schreibst ${count} Instagram-Captions für ${businessLabel}.`,
    `Projekt: ${project?.couple_name || project?.businessName || "Kundenprojekt"}.`,
    `Tonalität: ${tone || "natürlich"}.`,
    `Bildinformationen:\n${imageList}`,
    ``,
    'ERSTELLE JETZT GENAU ' + count + ' CAPTIONS. KRITISCHE REGELN:',
    'JEDE Caption MUSS ANDERS BEGINNEN als alle anderen. KEINE WIEDERHOLUNG. Jeder Einstieg ein völlig neuer Gedanke.',
    'Verwende ALLE diese Einstiegsarten GENAU EINMAL, dann erfinde komplett neue:',
    'Frage, Statement, Beobachtung, Detail-Aufzählung, Du-Ansprache, Mini-Story, CTA, Vergleich, Überraschung, Szene, rhetorische Frage, Pro-Tipp, Zitat, Gefühls-Erinnerung, Ein-Wort-Einstieg, Zukunftsausblick, Widerspruch, Understatement, Humor, Dringlichkeit.',
    'JEDE ZWEITE Caption braucht einen CTA (z.B. \'Jetzt entdecken\', \'Was denkst du?\', \'Probiers aus\').',
    'Jede Caption: 80-120 Wörter + 8-10 Hashtags.',
    'VERBOTENE Wörter am Satzanfang: Inmitten, Ein, Es, Man, Das, Die, Der.',
    'Satzlängen maximal durchmischen: 2 Wörter, dann 22. Kein Muster.',
    'Jede Caption fühlt sich an wie von einer ANDEREN Person geschrieben.',
    'Format: "Caption 1:" dann Text, "Caption 2:" dann Text, usw.',
    ...(styleProfile ? [`Stil: ${styleProfile}`] : []),
  ].join("\n");

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Kein API-Key" }, { status: 500 });
  }

  const isDeepseek = !process.env.OPENAI_API_KEY;
  const maxTokens = Math.min(4000, count * 400);

  try {
    const res = await fetch(
      isDeepseek
        ? `${(process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "")}/chat/completions`
        : "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: isDeepseek ? (process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash") : (process.env.OPENAI_MODEL ?? "gpt-5.4-mini"),
          messages: [
            {
              role: "system",
              content: `Du bist ein kreativer deutscher Social-Media-Texter. Deine Spezialität: JEDE einzelne Caption ist ein Unikat. Niemals zwei ähnliche Texte. Du schreibst für: ${businessLabel}.`
            },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 1.2,
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    const payload = await res.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!res.ok) throw new Error(payload?.error?.message ?? "API-Fehler");

    const raw = payload.choices?.[0]?.message?.content ?? "";

    // Parse captions from "Caption N: ..." format
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
