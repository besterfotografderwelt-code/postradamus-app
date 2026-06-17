import { NextResponse } from "next/server";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4o-mini";

const TEMPERATURE = 0.65;
const MAX_TOKENS_ANALYZE = 600;
const MAX_TOKENS_CAPTION = 1200;

const DEFAULT_BLOCKED_TERMS = [
  "unvergesslich", "Inmitten", "magisch", "besondere Momente", "einzigartig",
  "authentisch eingefangen", "perfekter Moment", "zauberhaft", "Traumkulisse",
  "märchenhaft", "blühend", "Pracht", "Herzenssache",
];

const CAPTION_STRATEGIES: Array<{ id: string; desc: string }> = [
  { id: "micro_observation", desc: "Beginne mit einer kleinen konkreten Beobachtung aus dem Bild." },
  { id: "confident_statement", desc: "Beginne mit einem selbstbewussten Statement." },
  { id: "behind_the_scene", desc: "Schreibe, als würde man einen kleinen Blick hinter den Moment bekommen." },
  { id: "small_luxury_moment", desc: "Beschreibe einen kleinen kostbaren Augenblick im Detail." },
  { id: "question_to_audience", desc: "Baue am Ende eine natürliche Frage an die Leser ein." },
  { id: "quiet_personal_thought", desc: "Beginne mit einem kurzen inneren Gedanken." },
  { id: "contrast_feeling", desc: "Nutze einen Gegensatz zwischen sichtbarer Szene und persönlichem Gefühl." },
  { id: "direct_oneliner", desc: "Erste Zeile kurz und direkt, danach persönlich." },
  { id: "detail_zoom", desc: "Zoome auf ein einziges konkretes Detail und erzähle davon ausgehend." },
  { id: "mood_first", desc: "Beginne mit der Stimmung, nicht mit dem Bildinhalt." },
];

// ── Narrator Profiles ──

type NarratorProfile = {
  narratorType: "brand_or_business" | "solo_expert" | "team" | "personal_brand" | "person_in_image";
  narratorLabel: string;
  industry: string;
  brandName: string;
  allowedPerspective: "we" | "i" | "neutral" | "mixed";
  forbiddenPerspective: string;
  description: string;
};

function buildNarratorProfile(businessType?: string, brandName?: string): NarratorProfile {
  const name = brandName || "Account";
  const b = (businessType || "").toLowerCase();

  const profiles: Record<string, NarratorProfile> = {
    hochzeitsfotograf: {
      narratorType: "solo_expert", narratorLabel: "Hochzeitsfotograf", industry: "Hochzeitsfotografie", brandName: name,
      allowedPerspective: "i", forbiddenPerspective: "person_in_image",
      description: "Ich ist der Fotograf, nicht die Braut oder das Paar.",
    },
    portraitfotograf: {
      narratorType: "solo_expert", narratorLabel: "Portraitfotograf", industry: "Portraitfotografie", brandName: name,
      allowedPerspective: "i", forbiddenPerspective: "person_in_image",
      description: "Ich ist der Fotograf. Die porträtierte Person spricht nicht.",
    },
    produktfotograf: {
      narratorType: "solo_expert", narratorLabel: "Produktfotograf", industry: "Produktfotografie", brandName: name,
      allowedPerspective: "i", forbiddenPerspective: "product_as_speaker",
      description: "Ich ist der Fotograf. Das Produkt spricht nicht.",
    },
    restaurant: {
      narratorType: "team", narratorLabel: "Restaurant-Team", industry: "Gastronomie", brandName: name,
      allowedPerspective: "we", forbiddenPerspective: "guest_or_food_as_speaker",
      description: "Wir ist das Restaurant-Team. Weder Gast noch Gericht sprechen.",
    },
    fitness: {
      narratorType: "solo_expert", narratorLabel: "Fitnesscoach", industry: "Fitness", brandName: name,
      allowedPerspective: "i", forbiddenPerspective: "client_in_image",
      description: "Ich ist der Coach. Die trainierende Person spricht nicht automatisch.",
    },
    mode: {
      narratorType: "team", narratorLabel: "Salon-Team", industry: "Beauty/Mode", brandName: name,
      allowedPerspective: "we", forbiddenPerspective: "client_in_image",
      description: "Wir ist der Salon. Die Kundin im Bild spricht nicht.",
    },
    hotel: {
      narratorType: "brand_or_business", narratorLabel: "Hotel", industry: "Hotellerie", brandName: name,
      allowedPerspective: "we", forbiddenPerspective: "guest_as_speaker",
      description: "Wir ist das Hotel. Der Gast im Bild spricht nicht.",
    },
    immobilien: {
      narratorType: "brand_or_business", narratorLabel: "Immobilienagentur", industry: "Immobilien", brandName: name,
      allowedPerspective: "we", forbiddenPerspective: "house_or_buyer_as_speaker",
      description: "Wir ist die Agentur. Die Immobilie spricht nicht.",
    },
    handwerk: {
      narratorType: "team", narratorLabel: "Handwerksbetrieb", industry: "Handwerk", brandName: name,
      allowedPerspective: "we", forbiddenPerspective: "customer_in_image",
      description: "Wir ist der Handwerksbetrieb. Der Kunde im Bild spricht nicht.",
    },
    reise: {
      narratorType: "brand_or_business", narratorLabel: "Reiseanbieter", industry: "Reise", brandName: name,
      allowedPerspective: "we", forbiddenPerspective: "traveler_as_speaker",
      description: "Wir ist der Reiseanbieter. Der Reisende im Bild spricht nicht.",
    },
    kunst: {
      narratorType: "solo_expert", narratorLabel: "Künstler", industry: "Kunst", brandName: name,
      allowedPerspective: "i", forbiddenPerspective: "artwork_as_speaker",
      description: "Ich ist der Künstler. Das Werk spricht nicht für sich.",
    },
    personal_brand: {
      narratorType: "person_in_image", narratorLabel: "Creator", industry: "Personal Brand", brandName: name,
      allowedPerspective: "i", forbiddenPerspective: "none",
      description: "Die sichtbare Person ist der Account und darf selbst sprechen.",
    },
  };

  return profiles[b] || profiles.sonstiges || {
    narratorType: "brand_or_business", narratorLabel: "Unternehmen", industry: b || "Allgemein", brandName: name,
    allowedPerspective: "we", forbiddenPerspective: "person_in_image",
    description: "Wir ist das Unternehmen. Personen im Bild sprechen nicht.",
  };
}

// ── Validator ──

function validateCaption(caption: string, narrator: NarratorProfile, prevOpenings: string[], blockedTerms: string[]): string[] {
  const errors: string[] = [];
  const lower = caption.toLowerCase();

  // Prefix check
  if (/^\s*(\*\*)?\s*(caption|beschreibung|das bild zeigt|auf dem bild|dieses bild|dieses foto)/i.test(caption)) {
    errors.push("Prefix/Bildbeschreibung am Anfang");
  }

  // Blocked terms
  for (const word of blockedTerms) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${esc}\\b`, "i").test(caption)) {
      errors.push(`Verboten: ${word}`);
    }
  }

  // Perspective check
  const personPhrases = ["mein hochzeitstag", "mein kleid", "mein mann", "meine frau", "mein styling",
    "meine frisur", "unser großer tag", "ich habe ja gesagt", "ich bin so glücklich", "ich fühle mich"];
  if (narrator.narratorType !== "person_in_image") {
    for (const phrase of personPhrases) {
      if (lower.includes(phrase)) {
        errors.push(`Person-im-Bild-Perspektive: "${phrase}"`);
        break;
      }
    }
  }
  if (narrator.allowedPerspective === "we" && /\bich\b|\bmich\b|\bmein\b|\bmeine\b/i.test(caption)) {
    errors.push("Ich-Form obwohl nur Wir-Perspektive erlaubt");
  }

  // Hashtags
  const hashtags = caption.match(/#[\w\u00C0-\u024F]+/g) || [];
  if (hashtags.length < 8 || hashtags.length > 10) {
    errors.push(`Hashtags: ${hashtags.length} (8-10)`);
  }

  // Words
  const words = caption.replace(/#[\w\u00C0-\u024F]+/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length < 80 || words.length > 120) {
    errors.push(`Wörter: ${words.length} (80-120)`);
  }

  // Opening similarity
  const opening = caption.split(/[.!?]/)[0].trim().toLowerCase();
  for (const prev of prevOpenings) {
    if (opening && prev && opening === prev) {
      errors.push("Satzanfang identisch mit vorheriger Caption");
      break;
    }
  }

  return errors;
}

// ── Helpers ──

function callOpenAI(type: string, messages: Array<Record<string, unknown>>) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: type === "analyze" ? MAX_TOKENS_ANALYZE : MAX_TOKENS_CAPTION,
      temperature: TEMPERATURE,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
    }),
    signal: AbortSignal.timeout(60_000),
  });
}

function parseJSON(raw: string): Record<string, unknown> {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  } catch { return {}; }
}

// ── Main Handler ──

export async function POST(request: Request) {
  if (!OPENAI_KEY) return NextResponse.json({ error: "Kein OpenAI-Key" }, { status: 500 });

  const { imageBase64, businessType, brandName, slotIndex, previousOpenings, blockedTerms, styleProfile } = await request.json();
  if (!imageBase64) return NextResponse.json({ error: "Kein Bild" }, { status: 400 });

  const narrator = buildNarratorProfile(businessType, brandName);
  const strategy = CAPTION_STRATEGIES[(slotIndex || 0) % CAPTION_STRATEGIES.length];
  const prevList: string[] = Array.isArray(previousOpenings) ? previousOpenings : [];
  const blocked: string[] = Array.isArray(blockedTerms) && blockedTerms.length > 0 ? blockedTerms : DEFAULT_BLOCKED_TERMS;

  try {
    // ── Step 1: Image Analysis ──
    const aRes = await callOpenAI("analyze", [
      { role: "system", content: "Analysiere Bilder. Nur JSON. Keine Einleitung. Keine Caption." },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64, detail: "high" } },
          { type: "text", text: `Gib NUR JSON: {"scene":"kurze Szene","subject":"Hauptmotiv","mood":"Stimmung","colors":["Farbe1","Farbe2"],"details":["Detail1","Detail2","Detail3"],"captionAngles":["Winkel1","Winkel2","Winkel3"]}. Nur Fakten, keine Interpretation.` },
        ],
      },
    ]);
    const aPayload = await aRes.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!aRes.ok) throw new Error(aPayload?.error?.message ?? "Analyse fehlgeschlagen");
    const analysis = parseJSON(aPayload.choices?.[0]?.message?.content ?? "");

    // ── Step 2: Caption ──
    const perspectiveRule = narrator.narratorType === "person_in_image"
      ? "Sichtbare Person = Erzähler. SCHREIBE ALS DIESE PERSON IN ICH-FORM."
      : narrator.allowedPerspective === "i"
        ? `SCHREIBE IN ICH-FORM. "Ich" = ${narrator.narratorLabel}. ${narrator.description}. NIE "wir". NIE als Person im Bild.`
        : `SCHREIBE IN WIR-FORM. "Wir" = ${narrator.narratorLabel}. ${narrator.description}. NIE "ich" als Person im Bild.`;

    const cRes = await callOpenAI("caption", [
      {
        role: "system",
        content: [
          `Du schreibst Instagram-Captions für verschiedene Branchen.`,
          `NARRATOR: ${JSON.stringify(narrator)}`,
          `REGEL: ${perspectiveRule}`,
          styleProfile ? `STIL: ${styleProfile}` : "",
          `Die Person oder das Objekt im Bild ist NICHT automatisch der Erzähler.`,
          `Nur wenn narratorType="person_in_image" darf die sichtbare Person selbst sprechen.`,
          `Natürlich, konkret, direkt. Kein Kitsch. Keine Bildbeschreibung.`,
        ].filter(Boolean).join(" "),
      },
      {
        role: "user",
        content: [
          `Schreibe eine Instagram-Caption (80-120 Wörter + 8-10 Hashtags).`,
          `NARRATOR: ${JSON.stringify(narrator)}`,
          `PERSPEKTIVE: ${perspectiveRule}`,
          styleProfile ? `STIL: ${styleProfile}` : "",
          `ANALYSE: ${JSON.stringify(analysis)}`,
          `STRATEGIE: ${strategy.desc}`,
          prevList.length ? `VERMEIDE Satzanfänge: ${prevList.join(" | ")}` : "",
          `BLOCKED: ${blocked.join(", ")}`,
          `- Kein Prefix, kein "Caption:", kein "Das Bild zeigt"`,
          `- Kein "ich" als Person im Bild (außer narratorType=person_in_image)`,
          `- Nutze 2-3 Details aus der Analyse`,
          `- JSON: {"caption":"Text mit Hashtags"}`,
        ].filter(Boolean).join("\n"),
      },
    ]);
    const cPayload = await cRes.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!cRes.ok) throw new Error(cPayload?.error?.message ?? "Caption fehlgeschlagen");

    let caption = "";
    const raw = cPayload.choices?.[0]?.message?.content ?? "";
    const parsed = parseJSON(raw);
    caption = (parsed.caption as string) || raw;

    // ── Validate & Retry ──
    let errors = validateCaption(caption, narrator, prevList, blocked);
    let retries = 0;
    while (errors.length > 0 && retries < 2) {
      const reasons = errors.join(". ");
      const rRes = await callOpenAI("retry", [
        { role: "system", content: `Korrigiere eine Instagram-Caption. Fehler: ${reasons}. NARRATOR: ${narrator.narratorLabel}. ${perspectiveRule}` },
        { role: "user", content: `Fehler: ${reasons}\nCaption: ${caption}\nStrategie: ${strategy.desc}\nGib NUR: {"caption":"korrigiert"}` },
      ]);
      const rPayload = await rRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      if (rRes.ok && rPayload.choices?.[0]?.message?.content) {
        const rParsed = parseJSON(rPayload.choices[0].message.content);
        if (rParsed.caption) caption = rParsed.caption as string;
      }
      errors = validateCaption(caption, narrator, prevList, blocked);
      retries++;
    }

    return NextResponse.json({ content: caption, generator: "openai-narrator" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
