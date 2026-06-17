import { NextResponse } from "next/server";
import { resolveBusinessContext } from "@/lib/content-generation";
import type { Project } from "@/lib/types";

export async function POST(request: Request) {
  const { images, project, tone, businessType, styleProfile } = await request.json();
  const business = resolveBusinessContext({ businessType: businessType ?? project?.businessType ?? "sonstiges" });

  const imageList = (images || [])
    .map((img: { filename?: string; sortOrder?: number; tags?: string[] }, i: number) =>
      `Bild ${i + 1}: ${img.filename ?? ""} (Tags: ${(img.tags ?? []).join(", ") || "keine"})`
    )
    .join("\n");

  const prompt = [
    `Du schreibst ${(images || []).length} Instagram-Captions für ${business.businessLabel}.`,
    `Projekt: ${project?.couple_name || project?.businessName || "Kundenprojekt"}.`,
    `Tonalität: ${tone || "natürlich"}.`,
    `Bildinformationen:\n${imageList}`,
    ``,
    `ERSTELLE JETZT ${(images || []).length} CAPTIONS. REGELN:`,
    `1. JEDE Caption muss KOMPLETT ANDERS sein – anderer Einstieg, andere Stimmung, anderer Satzbau`,
    `2. Keine zwei Captions dürfen auch nur ähnlich klingen`,
    `3. Variiere zwischen: Frage-Aufhänger, Statement, emotionale Beobachtung, Call-to-Action, Storytelling-Mini`,
    `4. Jede Caption: 80-120 Wörter, endet mit 8-10 Hashtags`,
    `5. Format: "Caption 1:" dann Text, "Caption 2:" dann Text, usw.`,
    `6. Keine Floskeln, keine Phrasen, keine Wiederholungen zwischen den Captions`,
    ...(styleProfile ? [`Stil des Nutzers: ${styleProfile}`] : []),
  ].join("\n");

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Kein API-Key" }, { status: 500 });
  }

  const isDeepseek = !process.env.OPENAI_API_KEY;
  const maxTokens = Math.min(4000, (images || []).length * 400);

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
              content: `Du bist ein kreativer deutscher Social-Media-Texter. Deine Spezialität: JEDE einzelne Caption ist ein Unikat. Niemals zwei ähnliche Texte. Du schreibst für: ${business.businessLabel}.`
            },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 1.2,
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    const payload: any = await res.json();
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
