import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { imageBase64, extraInstructions, styleProfile, businessType } = await request.json();
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return NextResponse.json({ error: "Kein OpenAI-Key" }, { status: 500 });
  }

  if (!imageBase64) {
    return NextResponse.json({ error: "Kein Bild" }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du schreibst Instagram-Captions basierend auf Bildern die du siehst. Gib direkt die Caption aus – KEINE Einleitung, KEINE Beschreibung, KEIN "Auf dem Bild sieht man". ICH-Form. Authentisch. Direkt. Nahbar.${extraInstructions ? ` ZUSATZ: ${extraInstructions}` : ""}${styleProfile ? ` STIL: ${styleProfile}` : ""}`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageBase64 } },
              { type: "text", text: `Schau dir dieses Bild genau an. Denk kurz darüber nach was du siehst. Dann schreibe NUR die Instagram-Caption (80-120 Wörter + 8-10 Hashtags) – KEINE Beschreibung davor. Branche: ${businessType || "allgemein"}.` },
            ],
          },
        ],
        max_tokens: 1400,
        temperature: 0.9,
        frequency_penalty: 1.5,
        presence_penalty: 1.5,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const payload = await response.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!response.ok) throw new Error(payload?.error?.message ?? "API-Fehler");

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Leere Antwort");

    return NextResponse.json({ content, generator: "openai-vision" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
