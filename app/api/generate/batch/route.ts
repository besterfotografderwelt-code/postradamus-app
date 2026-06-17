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
  const hooks = [
    "STARTER als wörtliche Frage an den Leser",
    "STARTER als kurzes starkes Statement (max 6 Wörter)",
    "STARTER als emotionale Beobachtung",
    "STARTER als Aufzählung von 2-3 konkreten Details aus den Bildern",
    "STARTER als direkte Ansprache mit 'Du'",
    "STARTER als Mini-Story von 15-20 Wörtern",
    "STARTER als Call-to-Action/Aufforderung",
    "STARTER als Vergleich (früher/heute oder Erwartung/Realität)",
    "STARTER als überraschende Aussage die man nicht erwartet",
    "STARTER als kurze Szene in einem Satz gemalt",
    "STARTER als rhetorische Frage",
    "STARTER als branchenspezifischer Pro-Tipp",
    "STARTER als Zitat (erfunden, aber glaubwürdig)",
    "STARTER als Erinnerung an ein Gefühl",
    "STARTER als Ein-Wort-Satz gefolgt von Erklärung",
    "STARTER als Zukunftsausblick / Was kommt als Nächstes",
  ];
  const assignments = Array.from({ length: count }, (_, i) => hooks[i % hooks.length]);
  const prompt = [
    `Du schreibst ${count} Instagram-Captions für ${businessLabel}.`,
    `Projekt: ${project?.couple_name || project?.businessName || "Kundenprojekt"}.`,
    `Tonalität: ${tone || "natürlich"}.`,
    `Bildinformationen:\n${imageList}`,
    ``,
    'ERSTELLE JETZT GENAU ' + count + ' CAPTIONS. REGELN:',
    '1. Caption 1 MUSS als ' + assignments[0] + ' beginnen.',
    ...(count > 1 ? ['2. Caption 2 MUSS als ' + assignments[1] + ' beginnen.'] : []),
    ...(count > 2 ? ['3. Caption 3 MUSS als ' + assignments[2] + ' beginnen.'] : []),
    ...(count > 3 ? ['4. Caption 4 MUSS als ' + assignments[3] + ' beginnen.'] : []),
    ...(count > 4 ? ['5. Caption 5 MUSS als ' + assignments[4] + ' beginnen.'] : []),
    ...(count > 5 ? ['6. Caption 6 MUSS als ' + assignments[5] + ' beginnen.'] : []),
    'JEDE Caption ist EINZIGARTIG. Keine ähnlichen Satzanfänge, keine gleichen Wörter am Anfang, kein gleicher Satzbau.',
    'Jede Caption: 80-120 Wörter, endet mit 8-10 thematisch passenden Hashtags.',
    'JEDE ZWEITE Caption MUSS einen Call-to-Action enthalten (z.B. "Schreib uns", "Probier es aus", "Was meinst du?", "Jetzt entdecken").',
    'ABSOLUTES VERBOT: "Inmitten von", "Ein Tag voller", "Es war einmal", "Man nehme". Keine Floskeln.',
    'Satzlängen wild durchmischen: mal 3 Wörter, dann 18. Kein Rhythmus-Muster.',
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
