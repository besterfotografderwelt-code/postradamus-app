import { NextResponse } from "next/server";
import {
  buildGenerationPrompt,
  generateDemoContent,
  type GenerationContext
} from "@/lib/content-generation";
import { projectOutputTypes, type ProjectOutputType } from "@/lib/types";

type GenerateRequest = {
  type?: ProjectOutputType;
  context?: GenerationContext;
};

function isValidRequest(body: GenerateRequest): boolean {
  return Boolean(
    body.type &&
    projectOutputTypes.includes(body.type) &&
    body.context?.project?.id &&
    typeof body.context.favoriteCount === "number" &&
    Array.isArray(body.context.tags)
  );
}

function readOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text.trim();

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function readChatCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

async function generateWithDeepSeek(prompt: string, businessType?: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return "";

  const branche = businessType || "Unternehmen";
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: `Du schreibst Instagram-Captions in der ICH-Form. STRIKTES VERBOT: WIR, uns, unser. VERBOTENE WÖRTER: Inmitten, Umarmung, Herz, Herzen, blühend, Pracht, Zauber, märchenhaft, unvergesslich, Magie, traumhaft. SCHREIB WIE EIN ECHTER MENSCH. Keine KI-Phrasen. Keine poetischen Floskeln. Kurze Sätze. Authentisch. Direkt. Nahbar. Branche: ${branche}.`
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1400,
      temperature: 1.0,
      frequency_penalty: 1.5,
      presence_penalty: 1.5
    }),
    signal: AbortSignal.timeout(45_000)
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify(payload.error)
        : "DeepSeek-Anfrage fehlgeschlagen.";
    throw new Error(message);
  }

  return readChatCompletionText(payload);
}

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return NextResponse.json({ error: "Projektkontext oder Inhaltstyp fehlt." }, { status: 400 });
  }

  const prompt = buildGenerationPrompt(body.type!, body.context!);

  // Demo mode override
  if (process.env.WEDDINGFLOW_AI_MODE === "demo") {
    return NextResponse.json({
      content: generateDemoContent((body.type || 'instagram_caption') as ProjectOutputType, (body.context || { project: { id: 'demo', coupleName: 'Demo' }, favoriteCount: 0, tags: [], extraInstructions: '' }) as GenerationContext),
      generator: "demo"
    });
  }

  // Use OpenAI Vision to actually SEE each image for unique captions
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI-Key fehlt", generator: "none" }, { status: 500 });
  }

  // If image thumbnail URL is provided, use Vision API
  const imageUrl = body.context?.thumbnailUrl;

  try {
    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: `Du schreibst EINE Instagram-Caption basierend auf dem Bild das du siehst. ICH-Form. Authentisch. Direkt. Nahbar. Keine poetischen Floskeln.${body.context?.extraInstructions ? ` EXTRA: ${body.context.extraInstructions}` : ""}${body.context?.styleProfile ? ` STIL: ${body.context.styleProfile}` : ""}`
      },
    ];

    if (imageUrl) {
      // Vision mode: send image + text
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: `Beschreibe in 2-3 Sätzen was du auf diesem Bild siehst. Dann schreibe eine Instagram-Caption in ICH-Form (80-120 Wörter + 8-10 Hashtags) die auf dem basiert was du SIEHST. Branche: ${body.context?.businessType || "allgemein"}.` },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1400,
        temperature: 0.9,
        frequency_penalty: 1.5,
        presence_penalty: 1.5,
      }),
      signal: AbortSignal.timeout(60_000)
    });

    const payload: unknown = await response.json();
    const content = readChatCompletionText(payload);
    if (content) {
      return NextResponse.json({ content, generator: "openai-vision" });
    }
    return NextResponse.json({ error: "OpenAI: Kein Inhalt", generator: "openai" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "OpenAI nicht erreichbar", generator: "none" }, { status: 500 });
  }
}
