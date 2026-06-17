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

function isValidRequest(body: GenerateRequest): body is Required<GenerateRequest> {
  return Boolean(
    body.type &&
    projectOutputTypes.includes(body.type) &&
    body.context?.project?.id &&
    typeof body.context.favoriteCount === "number" &&
    Array.isArray(body.context.tags) &&
    typeof body.context.extraInstructions === "string"
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
          content: `Du bist ein kreativer deutschsprachiger Social-Media-Texter mit starkem Stilbewusstsein. Du schreibst für ein Unternehmen aus der Branche: ${branche}. Verwende KEINE Fotografie-Sprache und KEINE Hochzeits-Begriffe, außer die Branche ist ausdrücklich Fotografie. Schreibe immer aus Sicht des Unternehmens, nicht aus Sicht eines Fotografen. JEDER Text muss sich deutlich von vorherigen unterscheiden – variiere Tonfall, Satzbau, Länge und Aufhänger.`
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 1400,
      temperature: 1.0,
      frequency_penalty: 0.8,
      presence_penalty: 0.8
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

  const prompt = buildGenerationPrompt(body.type, body.context);

  // Demo mode override
  if (process.env.WEDDINGFLOW_AI_MODE === "demo") {
    return NextResponse.json({
      content: generateDemoContent(body.type, body.context),
      generator: "demo"
    });
  }

  // 1. Try OpenAI first
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
          input: prompt
        }),
        signal: AbortSignal.timeout(60_000)
      });

      const payload: unknown = await response.json();
      if (response.ok) {
        const content = readOutputText(payload);
        if (content) {
          return NextResponse.json({ content, generator: "openai" });
        }
      }
      // OpenAI failed (quota, auth, etc.) → silently fall through to DeepSeek
    } catch {
      // OpenAI unreachable → silently fall through to DeepSeek
    }
  }

  // 2. Fallback to DeepSeek
  try {
    const deepSeekContent = await generateWithDeepSeek(prompt, body.context.businessType);
    if (deepSeekContent) {
      return NextResponse.json({ content: deepSeekContent, generator: "deepseek" });
    }
  } catch {
    // DeepSeek also failed → fall through to demo
  }

  // 3. Last resort: demo content
  return NextResponse.json({
    content: generateDemoContent(body.type, body.context),
    generator: "demo"
  });
}
