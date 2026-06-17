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
            content: `Du siehst ein Bild und schreibst genau dazu EINE Instagram-Caption. Gib NUR die Caption aus – kein Prefix, keine Analyse, keine Beschreibung. Starte sofort mit dem ersten Wort der Caption. ICH-Form. Authentisch. Direkt. Nahbar.${extraInstructions ? ` ZUSATZ: ${extraInstructions}` : ""}${styleProfile ? ` STIL: ${styleProfile}` : ""}`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageBase64 } },
              { type: "text", text: `Schreibe EINE Instagram-Caption (80-120 Wörter + 8-10 Hashtags) für dieses Bild. ICH-Form. Authentisch. Direkt. KEINE Bildbeschreibung davor. Starte direkt mit der Caption. Branche: ${businessType || "allgemein"}.` },
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

    const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) throw new Error("Leere Antwort");

    // Strip everything before "Caption:" if present
    let cleaned = raw;
    const captionMatch = cleaned.match(/\*\*Caption:\*\*\s*/i) || cleaned.match(/Caption:\s*/i);
    if (captionMatch && captionMatch.index !== undefined) {
      cleaned = cleaned.substring(captionMatch.index + captionMatch[0].length).trim();
    }

    // Split into lines and remove any containing description keywords
    cleaned = cleaned
      .split(/\n/)
      .filter((line: string) => {
        const l = line.toLowerCase();
        return !l.includes("auf diesem bild") && !l.includes("auf dem bild") && !l.includes("das bild") && !l.includes("ich sehe") && !l.includes("man sieht") && !l.includes("zu sehen") && !l.includes("erkennbar") && !l.includes("abgebildet") && !l.includes("frisch vermählt") && !l.startsWith("in diesem bild") && !l.includes("die braut") && !l.includes("der bräutigam") && !l.includes("das licht scheint") && !l.includes("das foto") && !l.includes("die aufnahme");
      })
      .join("\n")
      .trim();

    // Replace banned poetic words
    const banned = ["unvergesslich", "unvergesslicher", "unvergessliche", "märchenhaft", "zauberhaft", "traumhaft", "magisch", "blühend", "Pracht"];
    for (const w of banned) {
      const re = new RegExp(w, "gi");
      cleaned = cleaned.replace(re, "besonders");
    }

    const content = cleaned || raw;
    return NextResponse.json({ content, generator: "openai-vision" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
