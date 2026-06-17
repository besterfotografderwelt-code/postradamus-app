"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectImage } from "@/lib/types";

export type PlannedPost = {
  id: string;
  scheduledAt: string;
  type: "single" | "carousel" | "reel" | "story";
  images: ProjectImage[];
  caption: string;
  hashtags: string;
  mentions: string[];
  description: string;
};

type PostingPlanProps = {
  images: ProjectImage[];
  tone?: string;
  businessType?: string;
  onPlanChange?: (posts: PlannedPost[]) => void;
};

type PostSlot = {
  id: string;
  dayOffset: number;
  time: string;
  type: "single" | "carousel" | "reel" | "story";
  images: ProjectImage[];
  description: string;
  caption: string;
  hashtags: string;
};

type AnalyzedSlotContent = {
  key: string;
  caption: string;
  hashtags: string;
  summary: string;
  generator: "openai-vision" | "deepseek-metadata" | "metadata";
};

const MAX_ANALYSIS_IMAGES = 1;

function getFormat(type: PostSlot["type"]): string {
  if (type === "reel" || type === "story") return "9/16";
  return "4/5";
}

function formatDate(baseDate: Date, offset: number): string {
  const d = new Date(baseDate); d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "2-digit", month: "long" }).format(d);
}

function getOptimalTime(dayOffset: number): string {
  const day = (new Date().getDay() + dayOffset) % 7;
  if (day === 0) return "10:00";
  if (day === 6) return "09:00";
  return ["08:00", "13:00", "19:30"][dayOffset % 3];
}

function normalizeTone(tone: string): string {
  return tone.trim().toLowerCase();
}

function imagePriorityScore(img: ProjectImage): number {
  const tags = img.tags ?? [];
  let score = img.isFavorite ? 1000 : 0;

  if (tags.includes("Trauung")) score += 120;
  if (tags.includes("Paarshooting")) score += 110;
  if (tags.includes("Getting Ready")) score += 100;
  if (tags.includes("Party")) score += 90;
  if (tags.includes("Details")) score += 80;
  if (tags.includes("Dinner")) score += 70;
  if (tags.includes("Gruppenbilder")) score += 60;
  if (tags.includes("Location")) score += 40;
  if (tags.includes("Portrait")) score += 30;
  if (tags.includes("Emotionen")) score += 50;

  return score;
}

function slotAnalysisKey(slot: PostSlot, images: ProjectImage[], effectiveTone: string, businessType: string) {
  return [
    slot.id,
    slot.type,
    effectiveTone || "authentisch",
    businessType || "sonstiges",
    ...images.map((image) => `${image.id}:${image.name}`)
  ].join("|");
}

async function analyzePostSlot(slot: PostSlot, images: ProjectImage[], tone: string, businessType: string, styleProfile?: string) {
  const formData = new FormData();
  await Promise.all(images.slice(0, MAX_ANALYSIS_IMAGES).map(async (image, index) => {
    const response = await fetch(image.thumbnailUrl);
    const blob = await response.blob();
    formData.append("images", blob, image.name || `image-${index + 1}.jpg`);
  }));
  formData.append("metadata", JSON.stringify({
    businessType,
    tone: tone || "authentisch",
    slotType: slot.type,
    styleProfile: styleProfile || "",
    images: images.map((image) => ({
      id: image.id,
      name: image.name,
      tags: image.tags,
      isFavorite: image.isFavorite
    }))
  }));

  const response = await fetch("/api/analyze-post", {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(30_000)
  });
  const data = await response.json() as Partial<AnalyzedSlotContent> & { error?: string };
  if (!response.ok || !data.caption || !data.hashtags) {
    throw new Error(data.error || "Bildanalyse fehlgeschlagen.");
  }
  return data as Omit<AnalyzedSlotContent, "key">;
}

async function regenerateCaptionForTone(
  summary: string,
  tone: string,
  businessType: string,
  styleProfile?: string
): Promise<{ caption: string; hashtags: string } | null> {
  const response = await fetch("/api/retone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary, tone: tone || "authentisch", businessType, styleProfile }),
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) return null;
  const data = await response.json() as { caption?: string; hashtags?: string };
  if (!data.caption) return null;
  return { caption: data.caption, hashtags: data.hashtags || "" };
}

const weddingCaptions = [
  "Manche Momente brauchen keine große Bühne, nur gutes Licht und einen ehrlichen Blick. Genau dann entstehen Bilder, die später wieder fühlbar sind.",
  "Wenn Sekunden zu Erinnerungen werden, bleibt nicht nur ein Foto, sondern ein ganzes Gefühl zurück. Das ist der Teil, der am längsten trägt.",
  "Echte Gefühle, echte Bilder, echte Nähe. Mehr braucht es oft nicht, damit ein Tag später noch einmal auflebt.",
  "Hinter jedem Bild steckt ein kleiner Moment, der im richtigen Augenblick sichtbar geworden ist. Genau daraus entsteht eine starke Reportage.",
  "Authentisch, nah und zeitlos erzählt. So wirken Bilder nicht nur heute gut, sondern auch noch in vielen Jahren.",
  "Die Details machen den Unterschied, weil sie einem Tag Charakter geben und die Geschichte zwischen den großen Momenten erzählen.",
  "Von ruhig bis ausgelassen, von leise bis laut. Diese Mischung macht Hochzeitsbilder lebendig und glaubwürdig.",
  "Danke für diesen besonderen Tag. Wenn Liebe, Freude und gute Menschen zusammenkommen, bleibt das in Bildern lange spürbar.",
  "Ein Tag voller Liebe und Licht, mit kleinen Augenblicken, die im Rückblick oft die größte Wirkung haben.",
  "Das sind die Momente, die zählen: echte Blicke, kleine Gesten und all das, was man nicht inszenieren kann.",
  "Weniger Worte, mehr Gefühl. Genau deshalb dürfen gute Bilder Raum lassen und trotzdem sofort berühren.",
  "So fühlt sich echtes Glück an, wenn es nicht perfekt inszeniert, sondern ehrlich erlebt wurde.",
  "Wenn Bilder sprechen lernen, erzählen sie nicht nur, was passiert ist, sondern auch, wie es sich angefühlt hat.",
  "Pure Magie in jedem Frame, weil Licht, Timing und Emotion zusammen den Unterschied machen.",
  "Unvergesslich, ungefiltert und echt. So bleibt ein Hochzeitstag nicht nur schön, sondern lebendig.",
  "Diese Blicke sagen alles, auch dann noch, wenn längst wieder Ruhe eingekehrt ist.",
  "Mehr als nur Fotos, eher eine Erinnerung, die man immer wieder neu aufrufen kann.",
  "Timeless moments, captured forever, damit aus einem einzelnen Tag eine Geschichte für viele Jahre wird.",
  "Ein Hochzeitstag wie im Film, nur ohne Drehbuch und genau deshalb so besonders.",
  "Love is in the details, und genau diese Details machen den Tag einzigartig.",
];

const weddingHashtagSets = [
  "#hochzeitsfotografie #weddinginspiration #brautpaar #hochzeitsreportage #echtemomente #weddingday #hochzeit #love",
  "#hochzeitsreportage #echtemomente #weddingday #hochzeitsliebe #weddingstory #brautpaar #hochzeitsinspiration #hochzeit2026",
  "#hochzeit2026 #emotionalefotografie #love #weddingphotography #brautpaar #hochzeitsbilder #hochzeitsmomente #echtegefühle",
  "#hochzeitsinspiration #weddingstory #realweddings #hochzeitsfotografie #storytelling #authentisch #hochzeit #love",
  "#hochzeitsfotograf #storytelling #authentisch #weddingphotography #hochzeitsreportage #echtemomente #brautpaar #hochzeit",
  "#detailsderliebe #weddingdetails #hochzeit #hochzeitsfotografie #detailverliebt #weddinginspo #brautpaar #love",
  "#paarliebe #weddingvibes #brautundbräutigam #hochzeitsmomente #hochzeitsreportage #weddingday #emotionalefotografie #hochzeit",
  "#heiraten #verlobt #weddingseason #hochzeitsfotografie #brautpaar #hochzeitsinspiration #weddinglove #hochzeit2026",
  "#hochzeitsliebe #weddingphotography #momente #echtemomente #hochzeitsreportage #weddinginspiration #love #brautpaar",
  "#authentischefotografie #weddinglove #instawedding #hochzeitsfotografie #brautpaar #hochzeitsbilder #hochzeit #storytelling",
  "#hochzeitsdesign #weddingstyle #fineart #hochzeitsfotografie #elegantwedding #weddinginspiration #brautpaar #hochzeit",
  "#romantischehochzeit #traumhochzeit #ja #hochzeitsreportage #love #weddingday #brautpaar #hochzeitsmomente",
  "#weddingfun #hochzeitsparty #feiern #weddingday #hochzeitsfotografie #partytime #brautpaar #hochzeit",
  "#tränenausglück #emotional #weddingfeels #hochzeitsreportage #hochzeitsmomente #echtegefühle #love #brautpaar",
  "#editorialwedding #contemporary #modernlove #hochzeitsfotografie #weddingstyle #brautpaar #hochzeit #storytelling",
  "#minimalwedding #schlichtundschön #elegant #hochzeitsinspiration #weddingphotography #hochzeitsreportage #love #brautpaar",
  "#hochzeitsreportage #dokumentarisch #real #hochzeitsfotografie #echtemomente #weddingstory #brautpaar #hochzeit",
  "#weddingseason2026 #sommerhochzeit #outdoor #hochzeitsfotografie #brautpaar #weddinginspiration #hochzeit #love",
  "#brautkleid #weddingfashion #details #hochzeitsliebe #hochzeitsreportage #weddingday #brautpaar #hochzeit",
  "#hochzeitsideen #weddingplanning #inspo #hochzeitsinspiration #weddingphotography #echtemomente #brautpaar #love",
];

const fitnessCaptions = [
  "Jede Wiederholung bringt dich weiter. Genau darum geht es: nicht perfekt sein, sondern konsequent bleiben. 💪",
  "Fortschritt sieht nicht jeden Tag gleich aus, aber er ist immer da, wenn du genau hinschaust.",
  "Der beste Zeitpunkt war gestern. Der zweitbeste ist jetzt. Dein nächstes Level wartet nicht.",
  "Muskelkater ist nur Schwäche, die den Körper verlässt. Weiter geht's.",
  "Kein Filter, keine Inszenierung, nur echte Arbeit. So entsteht echte Veränderung.",
  "Ziele erreicht man nicht mit Ausreden, sondern mit Wiederholungen.",
  "Die einzige Person, die du schlagen musst, bist du selbst von gestern.",
  "Stärke kommt nicht vom Zuschauen. Sie kommt vom Machen, vom Durchhalten, vom Dranbleiben.",
  "Training ist nicht nur körperlich. Es formt auch den Kopf und macht ihn klar.",
  "Kleine Fortschritte sind immer noch Fortschritte. Notier sie, feier sie, bleib dran.",
  "Wenn du denkst, es geht nicht mehr, kommen noch drei Wiederholungen. Und genau die zählen.",
  "Disziplin ist die Brücke zwischen Zielen und Ergebnissen. Heute wieder ein Stück näher.",
  "Fitness ist kein Projekt mit Ablaufdatum. Es ist ein Lebensstil, der dich jeden Tag besser macht.",
  "Schweiß ist nur Fett, das weint. Und heute wurde wieder ordentlich geweint.",
  "Nicht vergleichen, sondern fokussieren. Dein Weg, dein Tempo, dein Erfolg.",
  "Ein leerer Studios ist am Morgen, ein voller am Abend. Dazwischen liegt echte Arbeit.",
  "Die beste Investition ist die in deine Gesundheit. Alles andere kommt danach.",
  "Ergebnisse kommen nicht über Nacht, aber sie kommen. Garantiert, wenn du bleibst.",
  "Dein Körper kann fast alles. Du musst ihn nur überzeugen, dass du es ernst meinst.",
  "Mental stark, körperlich stärker. So fühlt sich der Weg an, wenn er sich lohnt.",
];

const fitnessHashtags = [
  "#fitness #training #motivation #workout #gymlife #fitfam #fitnessmotivation #healthylifestyle #personaltrainer #coaching",
  "#workoutmotivation #gym #fitnessstudio #krafttraining #trainingsplan #fitnessgoal #progress #strong #disziplin #fit",
  "#fit #fitnessjourney #transformation #healthyliving #bodytransformation #gymmotivation #workoutdaily #fitnesslifestyle #fitgirl #fitfam",
  "#strength #kraft #muskelaufbau #bodybuilding #gymrat #fitnessaddict #trainhard #fitlife #health #trainingday",
  "#coaching #personaltraining #fitnesscoaching #motivationsspruch #mindset #ziele #fokus #disziplin #erfolge #dranbleiben",
  "#gymtime #workouttime #fitnessmotivation #healthy #fitfamgermany #trainingmotivation #gymflow #fitnessdaily #fitfamde #mobility",
  "#cardio #ausdauer #functional #core #bodyweight #crossfit #hiit #running #power #endurance",
  "#fitnesscommunity #teamworkout #grouptraining #fitnessclass #workoutbuddies #gymcommunity #fitfam #zusammenstark #motivation #training",
  "#fitnesstipps #trainingswissen #fitnessfacts #übungen #technik #formcheck #richtigtrainieren #fitnesswissen #tipps #workouts",
  "#gesundheit #wohlbefinden #selbstfürsorge #healthylife #bewegung #sport #aktiv #energie #vitalität #lebensfreude",
];

const restaurantCaptions = [
  "Hier schmeckt man, worum es wirklich geht: Handwerk, Leidenschaft und gute Zutaten. Genau so soll Essen sein.",
  "Die besten Gespräche entstehen bei gutem Essen. Wir haben den Tisch schon gedeckt.",
  "Von der Küche bis zum Teller: Jeder Handgriff zählt und schmeckt man am Ende.",
  "Regionale Zutaten, ehrliche Zubereitung und eine Atmosphäre, die bleibt.",
  "Gutes Essen braucht keine Show, nur Respekt vor dem Produkt und Zeit.",
  "Das Auge isst mit, aber der Geschmack bleibt. Deshalb legen wir auf beides wert.",
  "Zwischen Vorspeise und Dessert liegt oft der beste Abend der Woche.",
  "Handwerk beginnt in der Küche und endet auf deinem Teller. Heute wieder mit viel Liebe gemacht.",
  "Saisonal, regional, ehrlich. Das ist nicht nur ein Spruch bei uns, sondern der Plan.",
  "Gastgeber sein bedeutet mehr als nur kochen. Es bedeutet, eine Auszeit zu schenken.",
  "Ein voller Tisch, ein zufriedener Gast und ein Team, das weiß, was es tut.",
  "Qualität merkst du beim ersten Bissen und erinnerst dich beim letzten.",
  "Küche ist kein Geheimnis, sondern Handwerk mit Herz. Bei uns kannst du zusehen.",
  "Vom Markt bis auf den Teller dauert es bei uns keine Umwege. Das schmeckt man.",
  "Ambiente, Service, Geschmack - alles muss stimmen, damit es ein perfekter Abend wird.",
];

const restaurantHashtags = [
  "#restaurant #gastro #gastronomie #food #genuss #küche #restauranttipp #essen #lecker #foodfotografie",
  "#regional #saisonal #frischeküche #qualität #handwerk #kochen #küchenchef #gourmet #geniessen #ausgehen",
  "#restaurantliebe #gastgeben #gasthaus #lokal #wirtshaus #biergarten #cafe #bar #lounge #dining",
  "#foodlover #instafood #foodporn #foodie #yummy #delicious #homemade #slowfood #finewining #culinary",
  "#mittagstisch #abendessen #dinner #feierabend #auszeit #schlemmen #schmecken #gusto #gaumenfreude #lieblingslokal",
  "#teamküche #küchenliebe #kochkunst #plating #foodstyling #angerichtet #tellerliebe #foodgram #instayummy #kulinarik",
];

const productCaptions = [
  "Form, Funktion und der erste Eindruck, der sitzt. Genau so muss ein Produkt wirken.",
  "Qualität, die man sieht und spürt. Keine leeren Versprechungen, sondern echte Details.",
  "Die Magie steckt im Detail. Deshalb zeigen wir, was andere übersehen.",
  "Handwerk, das hält, was es verspricht. Von der Idee bis zum fertigen Stück.",
  "Clean, präzise und mit klarem Fokus auf das Wesentliche.",
  "Gutes Design braucht keine Erklärung. Es spricht für sich selbst.",
  "Ein Produkt, das überzeugt, braucht keine lauten Worte. Nur eine saubere Präsentation.",
  "Von der Verarbeitung bis zur Haptik: Hier sieht man den Unterschied.",
  "Ehrliche Materialien, klare Linien und eine Form, die ihren Zweck erfüllt.",
  "Was gut gemacht ist, darf man zeigen. Und zwar von allen Seiten.",
  "Jedes Detail erzählt eine Geschichte über die Arbeit, die darin steckt.",
  "Bevor es in deine Hände kommt, war es unsere Leidenschaft.",
];

const productHashtags = [
  "#produktfotografie #produkt #design #handwerk #qualität #branding #ecommerce #detail #madeinaustria #shoplocal",
  "#produktdesign #verarbeitung #material #clean #minimal #ästhetik #productphotography #productshot #brand #business",
  "#handmade #craftmanship #details #productlaunch #newproduct #innovation #qualität #premium #wertig #marke",
  "#produktfoto #produktpräsentation #onlineshop #shopify #etailment #katalog #lookbook #kollektion #neuheit #produktion",
];

const genericCaptions = [
  "Wir zeigen, was wirklich wichtig ist: echte Einblicke, klare Werte und keine Inszenierung.",
  "Hinter jedem Projekt stecken Menschen mit einer Vision. Hier siehst du einen Teil davon.",
  "Die besten Ergebnisse entstehen, wenn man genau hinschaut und den Mut zum Wesentlichen hat.",
  "Was zählt, ist nicht die große Show, sondern der echte Mehrwert. Den zeigen wir hier.",
  "Transparenz, Qualität und der Blick fürs Detail. Das sind keine Buzzwords, das ist unser Anspruch.",
  "Ein Einblick, der zeigt, worauf es ankommt. Ohne Filter, ohne Übertreibung.",
  "Manche Momente muss man nicht erklären. Sie zeigen sich von selbst, wenn man genau hinsieht.",
  "Der Unterschied liegt oft im Detail. Und das feiern wir hier ohne große Worte.",
  "Was uns ausmacht, sieht man nicht auf den ersten Blick. Aber auf den zweiten sofort.",
  "Erfolg ist kein Zufall, sondern die Summe vieler guter Entscheidungen.",
  "Nicht mehr, sondern besser. Das zieht sich durch alles, was wir tun.",
  "Echt, direkt und ohne Umwege. So kommunizieren wir seit Tag eins.",
];

const genericHashtagSets = [
  "#branding #unternehmen #business #qualität #team #vision #werte #echt #konsequent #erfolg",
  "#business #marke #unternehmen #storytelling #werte #teamwork #qualität #innovation #ziel #motivation",
  "#kmu #businessowner #unternehmertum #vision #zukunft #erfolg #team #echtheit #leistung #wert",
];

function generatePostSlots(images: ProjectImage[], tone: string, businessType = "sonstiges"): PostSlot[] {
  const normalizedBusinessType = businessType.trim().toLowerCase();
  const isWeddingBusiness = normalizedBusinessType === "hochzeitsfotograf";
  const all = [...images].sort((a, b) => imagePriorityScore(b) - imagePriorityScore(a));
  const favorites = all.filter((img) => img.isFavorite);
  if (all.length === 0) return [];

  const slots: PostSlot[] = [];
  const usedImages = new Set<string>();
  let idx = 0;

  function pick(n: number) { return all.filter((img) => !usedImages.has(img.id)).slice(0, n); }
  function mark(imgs: ProjectImage[]) { imgs.forEach((img) => usedImages.add(img.id)); }

  // Tone-variant captions
  const toneKey = normalizeTone(tone);
  const toneCaptions: Record<string, string[]> = {
    romantisch: [
      "Ein Tag, zwei Herzen und viele kleine Momente, die sich im Rückblick wie ein einziger schöner Film anfühlen.",
      "Wenn Blicke mehr sagen als Worte, entsteht genau diese stille, warme Art von Romantik, die man nicht planen kann.",
      "Für die Ewigkeit erzählt, ohne laut zu sein. Genau das macht solche Bilder so stark.",
      "Romantik in jedem Frame, weil Nähe oft in den kleinen Gesten steckt, nicht in großen Posen.",
      "Liebe pur, aber ehrlich und unaufgeregt. So bleibt es zeitlos.",
    ],
    lustig: [
      "Lachen ist die beste Trauung, vor allem wenn der Tag genauso lebendig wird, wie er begonnen hat.",
      "Erst Ja, dann Party. Genau in dieser Reihenfolge und bitte mit viel guter Laune.",
      "Verheiratet und immer noch mit Humor. Das sind die besten Voraussetzungen für starke Bilder.",
      "Der lustigste Tag ever, festgehalten zwischen schönen Details und sehr viel Bewegung.",
      "Tanzfläche zerstört, Stimmung gerettet. So soll ein Abend aussehen.",
    ],
    emotional: [
      "Gänsehaut-Garantie, weil echte Emotionen nicht gestellt wirken müssen, um stark zu sein.",
      "Tränen aus Glück sind oft die stillsten, aber genau deshalb bleiben sie so lange im Kopf.",
      "Dieser Moment für immer: nicht perfekt inszeniert, aber genau richtig gefühlt.",
      "Herz über Kopf, und genau deshalb so unvergesslich.",
      "Manche Tage vergisst man nie, weil sie sich schon in der Kamera besonders angefühlt haben.",
    ],
    modern: [
      "Clean, echt und zeitlos, damit die Bildsprache ruhig bleibt und trotzdem sofort wirkt.",
      "Minimal, maximal auf Wirkung reduziert. Mehr braucht es oft nicht.",
      "Weniger ist mehr, wenn Licht, Komposition und Timing sauber zusammenspielen.",
      "Elegant und unkompliziert, aber nie beliebig.",
      "Moderne Liebesgeschichte mit klarer Bildsprache und viel Raum für echte Momente.",
    ],
    kurz: [
      "Perfekt, wenn man es klar und ohne Umwege auf den Punkt bringen will.",
      "Einfach schön, und manchmal ist genau das schon die beste Beschreibung.",
      "Ein Bild, ein Gefühl, ein klarer Moment.",
      "Kurz gesagt: Liebe, Licht und ein sauberer Augenblick.",
      "Das war's. Und trotzdem steckt in solchen Momenten oft am meisten.",
    ],
    motivierend: [
      "Du schaffst das, weil Konstanz am Ende immer sichtbare Spuren hinterlässt.",
      "Ein Schritt nach dem anderen reicht, solange man weitergeht.",
      "Ein guter Moment startet oft dort, wo man dranbleibt.",
      "Dranbleiben lohnt sich, besonders wenn das Ergebnis so sauber und stark aussieht.",
      "Das sieht nach Rückenwind aus, und genau so darf es weitergehen.",
    ],
    informativ: [
      "Kurz zusammengefasst: Hier geht es um klare Bildsprache und nachvollziehbare Momente.",
      "Ein kleiner Einblick, wie aus vielen Einzelbildern eine stimmige Geschichte wird.",
      "Was man hier sieht, sind echte Momente mit einem sauberen roten Faden.",
      "Ein Blick in den Ablauf, damit sichtbar wird, wie die Story aufgebaut ist.",
      "So entsteht die Story: ruhig, strukturiert und ohne unnötige Effekte.",
    ],
    lässig: [
      "Locker, echt und ohne Chichi, damit die Stimmung genauso rüberkommt, wie sie war.",
      "Einfach laufen lassen und genau die Momente festhalten, die natürlich entstehen.",
      "Ganz entspannt festgehalten, mit genug Luft für echte Bewegung und echte Mimik.",
      "Nichts gestellt, alles echt. So bleibt der Look glaubwürdig.",
      "So fühlt sich der Tag an: leicht, nahbar und ohne Drama.",
    ],
  };
  const baseCaptions = isWeddingBusiness ? weddingCaptions
    : normalizedBusinessType === "fitness" ? fitnessCaptions
    : normalizedBusinessType === "restaurant" ? restaurantCaptions
    : normalizedBusinessType === "produktfotograf" ? productCaptions
    : genericCaptions;
  const baseHashtags = isWeddingBusiness ? weddingHashtagSets
    : normalizedBusinessType === "fitness" ? fitnessHashtags
    : normalizedBusinessType === "restaurant" ? restaurantHashtags
    : normalizedBusinessType === "produktfotograf" ? productHashtags
    : genericHashtagSets;
  const activeCaptions = [""];
  function nextCaption() { return ""; }

  const weddingStoryCaptions: Record<string, string[]> = {
    romantisch: ["Hinter den Kulissen der Liebe, wo die stillen Sekunden oft schon die schönste Stimmung tragen.", "Ein kleiner Blick vor dem großen Moment, bevor die eigentliche Geschichte beginnt.", "Leise Vorfreude, große Gefühle und genau die Ruhe, die man später noch spürt."],
    lustig: ["Backstage mit Chaos und Charme, weil die besten Geschichten selten perfekt sortiert sind.", "Kurz hinter den Kulissen, bevor aus Vorbereitung endlich Feier wird.", "Noch schnell ein Blick vor dem Ja-Wort und dann darf es auch losgehen."],
    emotional: ["Ein stiller Blick hinter die Kulissen, mit diesem besonderen Moment kurz vor der Gänsehaut.", "Der Moment vor der Gänsehaut, wenn schon alles in der Luft liegt.", "Vor dem großen Augenblick, aber emotional oft schon mittendrin."],
    modern: ["Klar, reduziert und echt, damit die Bildsprache sofort auf den Punkt kommt.", "Ein sauberer Blick hinter die Kulissen, ohne visuelles Rauschen.", "Minimal, direkt und nah dran, damit der Moment für sich sprechen kann."],
    kurz: ["Backstage, aber mit Gefühl.", "Kurz davor und schon mittendrin.", "Ein Blick dahinter, bevor es ernst wird."],
    motivierend: ["Der Startschuss hinter den Kulissen, bevor aus Planung echte Umsetzung wird.", "Vorbereitung mit gutem Gefühl, damit der nächste Schritt sauber sitzt.", "Da geht noch was, und genau deshalb lohnt sich der Blick hinter die Kulissen."],
    informativ: ["Ein Blick hinter die Kulissen, damit der Ablauf greifbarer wird.", "So läuft der Moment davor, Schritt für Schritt und ohne Umwege.", "Backstage der Reportage: kurz, klar und nützlich eingeordnet."],
    lässig: ["Locker hinter den Kulissen, ohne Druck und ohne Show.", "Ganz entspannt davor, während sich alles langsam zusammenfügt.", "Ein kurzer Blick backstage, bevor der eigentliche Teil beginnt."],
  };
  const genericStoryCaptions = [
    "Kurz vor dem nächsten Schritt, damit der Einstieg ruhig und klar bleibt.",
    "Ein kleiner Blick hinter die Kulissen, bevor der eigentliche Teil beginnt.",
    "Nah dran, ohne laut zu sein. Genau so bleibt die Szene angenehm greifbar."
  ];
  const activeStoryCaptions = toneKey && weddingStoryCaptions[toneKey]
    ? weddingStoryCaptions[toneKey]
    : isWeddingBusiness
      ? [
        "Ein kurzer Blick vor dem eigentlichen Moment, damit die Stimmung nicht verloren geht.",
        "Kurz davor, ganz nah dran und mit genau der Ruhe, die später oft am stärksten wirkt.",
        "Vorbereitung, Stimmung und ein ehrlicher erster Eindruck statt Standardtext."
      ]
      : genericStoryCaptions;
  function nextStoryCaption() { return activeStoryCaptions[idx++ % activeStoryCaptions.length]; }

  // 1. Reel opening (if enough tagged images)
  const focusTags = isWeddingBusiness
    ? ["Trauung", "Party", "Getting Ready"]
    : normalizedBusinessType === "fitness"
      ? ["Workout", "Transformation", "Studio", "Motivation"]
      : normalizedBusinessType === "restaurant"
        ? ["Gerichte", "Interior", "Team", "Zubereitung"]
        : normalizedBusinessType === "produktfotograf"
          ? ["Weißer Hintergrund", "Lifestyle", "Detail", "Verpackung", "Flatlay", "Werbung"]
          : ["Studio", "Outdoor", "Business", "Familie", "Kinder", "Bewerbung", "Arbeit", "Projekt", "Detail", "Details"];
  const reelImgs = all.filter((img) => img.tags.some((t) => focusTags.includes(t)));
  if (reelImgs.length >= 3) {
    const imgs = reelImgs.filter((img) => !usedImages.has(img.id)).slice(0, 4);
    mark(imgs);
    slots.push({ id: "reel", dayOffset: 1, time: "19:30", type: "reel", images: imgs, description: "Reel: Stimmung & erste Eindrücke", caption: nextCaption(), hashtags: baseHashtags[idx % baseHashtags.length] });
  }

  // 2. Story teaser
  const story1 = pick(1);
  if (story1.length > 0) {
    mark(story1);
    slots.push({
      id: "story-1",
      dayOffset: 1,
      time: "12:00",
      type: "story",
      images: story1,
      description: isWeddingBusiness ? "Story: Hinter den Kulissen" : "Story: Ein Blick hinter die Kulissen",
      caption: nextStoryCaption(),
      hashtags: ""
    });
  }

  // 3. Carousel of favorites
  const favImgs = favorites.filter((img) => !usedImages.has(img.id));
  if (favImgs.length >= 2) {
    const carouselImgs = favImgs.slice(0, Math.min(8, favImgs.length));
    mark(carouselImgs);
    slots.push({ id: "carousel-fav", dayOffset: 3, time: "13:00", type: "carousel", images: carouselImgs, description: "Carousel: Die schönsten Momente", caption: nextCaption(), hashtags: baseHashtags[idx % baseHashtags.length] });
  }

  // 4. ALL remaining images as posts (singles or small carousels)
  const remaining = all.filter((img) => !usedImages.has(img.id));

  // Safety: ensure no duplicates
  const seen = new Set(usedImages);
  const uniqueRemaining = remaining.filter((img) => {
    if (seen.has(img.id)) return false;
    seen.add(img.id);
    return true;
  });
  let postDay = 5;
  let i = 0;
  while (i < uniqueRemaining.length) {
    const isMulti = uniqueRemaining.length > 10 && i % 5 === 0 && i + 2 < uniqueRemaining.length;
    const count = isMulti ? 3 : 1;
    const imgs = uniqueRemaining.slice(i, i + count);
    mark(imgs);
    const type: PostSlot["type"] = isMulti ? "carousel" : "single";
    const imgName = imgs[0]?.name?.replace(/\.(jpg|jpeg)$/i, "") || `Bild ${i + 1}`;
    const imgTags = imgs[0]?.tags || [];
    const isCTA = i % 4 === 0;
    const captionVariants = (() => {
      const toneKey = normalizeTone(tone);
      const toneSuffix: string[] = toneKey === "lustig"
        ? ["Mit null Langeweile und einem dicken Grinsen im Feed. 😂🎉", "Gute Laune ist ansteckend. Wir sind heute der Beweis dafür."]
        : toneKey === "emotional"
          ? ["Dieser Moment geht unter die Haut, weit tiefer als Worte je könnten. ❤️", "Manche Sekunden tragen mehr Gefühl als ganze Tage."]
          : toneKey === "motivierend"
            ? ["Aufgeben ist keine Option. Der nächste Schritt beginnt genau hier. 💪🔥", "Disziplin schlägt Motivation jeden Tag. Heute wieder bewiesen."]
            : toneKey === "romantisch"
              ? ["Mit ganz viel Herz und einem Blick, der mehr sagt als tausend Worte. 🤍", "Leise Nähe, große Gefühle. Genau so fühlt sich dieser Moment an."]
              : toneKey === "modern"
                ? ["Clean. Direct. No bullshit. So halten wir das.", "Weniger Gelaber, mehr Style. Punkt."]
                : toneKey === "kurz"
                  ? ["Genau so.", "Mehr braucht's nicht."]
                  : toneKey === "informativ"
                    ? ["Die Fakten zählen, nicht die Verpackung. Hier sind sie, klar und sauber.", "Kein Hype, kein Blabla. Nur das, was wirklich zählt."]
                    : toneKey === "lässig"
                      ? ["Ganz easy. Kein Grund, sich zu verstellen oder groß aufzutrumpfen.", "So läuft's bei uns: entspannt, ehrlich, ohne Schnickschnack."]
                      : [];

      const makeToned = (specific: string) => {
        if (toneSuffix.length === 0) return [specific];
        // Alternate between tag-specific and tone-specific captions
        return [specific, ...toneSuffix];
      };

      if (isWeddingBusiness) {
        return makeToned(
          isCTA
            ? `Welcher Moment hat euch am meisten berührt? 💬 Schreibt es in die Kommentare - wir sind gespannt, welches Bild euch sofort wieder ins Gefühl von diesem Tag zurückholt.`
            : imgTags.includes("Trauung")
              ? `Wenn aus einem Ja-Wort tausend Erinnerungen werden, entsteht genau diese Art von Bild. Echt, nah und voller Bedeutung, damit der Moment später wieder ganz präsent wird. ${imgName}.`
              : imgTags.includes("Paarshooting")
                ? `Zwei Menschen, ein Moment, pure Magie. Dieses Bild zeigt, was Liebe wirklich bedeutet, wenn alles andere kurz leiser wird. ✨`
                : imgTags.includes("Party")
                  ? `Tanzen, bis die Schuhe fliegen. 🕺 Kein Inszenieren, nur echte Freude und eine Stimmung, die man auch später noch sofort wieder erkennt.`
                  : imgTags.includes("Getting Ready")
                    ? `Die Vorfreude im Blick, noch bevor der Trubel losgeht. Genau solche stillen Augenblicke werden später oft zu den wertvollsten Bildern des Tages.`
                    : imgTags.includes("Details")
                      ? `Sind es nicht oft die kleinen Dinge, die eine Hochzeit unvergesslich machen? Jedes Detail erzählt seine eigene Geschichte und gibt dem Tag seine eigene Handschrift.`
                      : imgTags.includes("Dinner")
                        ? `Gutes Essen, gute Gespräche und Momente, die in Erinnerung bleiben. Diese Stimmung lässt sich nicht inszenieren, nur ehrlich festhalten.`
                        : imgTags.includes("Gruppenbilder")
                          ? `Familie und Freunde sind die Menschen, die diesen Tag erst vollständig machen. Welches Gesicht zaubert dir beim Zurückschauen sofort ein Lächeln?`
                          : `Ein Bild sagt mehr als tausend Worte, aber dieses hier erzählt noch ein bisschen mehr: echte Gefühle, Nähe und den Zauber dieses Tages in einem einzigen Moment.`
        );
      }

      if (normalizedBusinessType === "fitness") {
        return makeToned(
          isCTA
            ? `Welches Training hat dich diese Woche am meisten gefordert? 💬 Schreib es in die Kommentare - wir wollen wissen, wo du an deine Grenzen gehst.`
            : imgTags.includes("Workout")
              ? `Training, das sich lohnt, sieht man. Und spürt man erst recht. Heute wieder alles gegeben. 🔥`
              : imgTags.includes("Transformation")
                ? `Von hier nach da. Kein Filter, keine Tricks, nur echte Arbeit über Zeit. Genau so sieht Fortschritt aus.`
                : imgTags.includes("Studio")
                  ? `Hier passiert die Magie. Nicht durch Zauberei, sondern durch Wiederholung, Disziplin und den Willen, besser zu werden.`
                  : imgTags.includes("Motivation")
                    ? `Der Kopf sagt manchmal Nein, aber der Körper kann mehr, als man denkt. Genau da fängt Wachstum an. 💪`
                    : imgTags.includes("Team") || imgTags.includes("Gruppe")
                      ? `Gemeinsam stärker. Das ist kein Spruch, das ist Physik. Wer mit anderen trainiert, wächst schneller.`
                      : imgTags.includes("Outdoor")
                        ? `Frische Luft, freier Blick und ein Training, das den ganzen Körper fordert. So startet ein guter Tag.`
                        : `Jeder Tag im Studio ist ein Schritt nach vorne. Manche sieht man, manche spürt man nur. Beide zählen.`
        );
      }

      if (normalizedBusinessType === "restaurant") {
        return makeToned(
          isCTA
            ? `Was war dein letztes richtiges Geschmackserlebnis? 💬 Schreib es in die Kommentare - wir lieben kulinarische Inspiration.`
            : imgTags.includes("Gerichte")
              ? `Frisch zubereitet, ehrlich angerichtet und mit genau dem Geschmack, der bleibt. Heute wieder mit Liebe gekocht.`
              : imgTags.includes("Interior")
                ? `Atmosphäre ist die geheime Zutat. Hier stimmt das Ambiente genauso wie der Geschmack.`
                : imgTags.includes("Team")
                  ? `Ein gutes Team macht den Unterschied zwischen einem Essen und einem Erlebnis. Danke an unsere Küchencrew.`
                  : imgTags.includes("Zubereitung")
                    ? `Handwerk, das man schmeckt. Jeder Handgriff zählt, bis es auf den Teller kommt.`
                    : `Gutes Essen, gute Gesellschaft, gute Zeit. Mehr braucht es manchmal nicht für einen perfekten Abend.`
        );
      }

      if (normalizedBusinessType === "produktfotograf") {
        return makeToned(
          isCTA
            ? `Welches Detail fällt dir als Erstes auf? 💬 Schreib es in die Kommentare - wir sind gespannt auf deinen Blick.`
            : imgTags.includes("Detail")
              ? `Auf den zweiten Blick entscheidet sich Qualität. Deshalb zeigen wir, was nicht sofort sichtbar ist.`
              : imgTags.includes("Weißer Hintergrund")
                ? `Pur, klar und ohne Ablenkung. So kommt das Produkt genau so rüber, wie es gedacht ist.`
                : imgTags.includes("Lifestyle")
                  ? `Im Einsatz sieht man erst, was ein gutes Produkt wirklich kann. Nicht gestellt, sondern echt.`
                  : `Design, das für sich spricht. Haptik, die überzeugt. Ein Produkt, das man zeigen darf.`
        );
      }

      // generic
      return makeToned(
        isCTA
          ? `Was nimmst du aus diesem Einblick mit? 💬 Schreib es in die Kommentare - deine Perspektive interessiert uns.`
          : imgTags.includes("Team")
            ? `Menschen machen den Unterschied. Hier sieht man, wer mit Leidenschaft dabei ist.`
            : imgTags.includes("Detail") || imgTags.includes("Details")
              ? `Oft sind es die kleinen Dinge, die den größten Eindruck hinterlassen. Hier ist eines davon.`
              : `Ein Moment, der zeigt, worum es wirklich geht. Keine Show, sondern Substanz.`
      );
    })();
    slots.push({
      id: `post-${i}`,
      dayOffset: postDay++,
      time: getOptimalTime(postDay),
      type,
      images: imgs,
      description: isMulti ? `Carousel: ${imgs.length} Bilder` : `Einzelbild: ${imgName}`,
      caption: captionVariants[i % captionVariants.length],
      hashtags: baseHashtags[i % baseHashtags.length]
    });
    i += count;
  }

  // 5. Closing story
  const closeStory = uniqueRemaining.filter((img) => !usedImages.has(img.id)).slice(i, i + 2);
  if (closeStory.length > 0) {
    mark(closeStory);
    slots.push({
      id: "story-close",
      dayOffset: postDay,
      time: "20:00",
      type: "story",
      images: closeStory,
      description: isWeddingBusiness ? "Story: Abschluss" : "Story: Abschluss der Reihe",
      caption: isWeddingBusiness
        ? "Danke für diesen Tag und für all die kleinen Momente, die ihn so besonders gemacht haben. 🤍"
        : "Danke für den Einblick und für all die kleinen Momente, die die Serie so rund gemacht haben.",
      hashtags: ""
    });
  }

  return slots;
}

type Cadence = { interval: "daily" | "weekly" | "monthly"; count: number };

function buildScheduledAt(baseDate: Date, dayOffset: number, time: string): string {
  const [hours = "0", minutes = "0"] = time.split(":");
  const date = new Date(baseDate);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toISOString();
}

function normalizeMentions(value: string): string[] {
  return Array.from(new Set(
    value
      .split(/[\s,;]+/)
      .map((item) => item.trim().replace(/^@+/, ""))
      .filter((item) => /^[A-Za-z0-9._]{1,30}$/.test(item))
      .map((item) => `@${item}`)
  ));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMentionLine(caption: string, mentions: string[]): string {
  return mentions.reduce(
    (current, mention) => current.replace(new RegExp(`(^|\\s)${escapeRegExp(mention)}(?=\\s|$)`, "gi"), " "),
    caption
  ).replace(/\s{2,}/g, " ").trim();
}

function composePreviewCaption(caption: string, mentions: string[]): string {
  const cleanedCaption = stripMentionLine(caption, mentions);
  return [cleanedCaption, mentions.join(" ")].filter(Boolean).join("\n\n");
}

export function PostingPlan({ images, tone = "", businessType = "sonstiges", onPlanChange }: PostingPlanProps) {
  const [cadence, setCadence] = useState<Cadence>({ interval: "weekly", count: 3 });
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [editedHashtags, setEditedHashtags] = useState<Record<string, string>>({});
  const [mentionInputs, setMentionInputs] = useState<Record<string, string>>({});
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  const [imageOverrides, setImageOverrides] = useState<Record<string, ProjectImage[]>>({});
  const [cropPositions, setCropPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hiddenPosts, setHiddenPosts] = useState<Set<string>>(new Set());
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [analyzedSlots, setAnalyzedSlots] = useState<Record<string, AnalyzedSlotContent>>({});
  const [slotTones, setSlotTones] = useState<Record<string, string>>({});
  const analyzingKeys = useRef<Set<string>>(new Set());
  const baseDate = useRef(new Date()).current;

  const styleProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem("flowstream.onboarding");
      if (raw) return JSON.parse(raw).styleProfile?.promptAddition || "";
    } catch {}
    return "";
  }, []);

  const slots = useMemo(() => generatePostSlots(images, tone, businessType), [images, tone, businessType]);

  const filteredSlots = useMemo(() => {
    if (slots.length === 0) return [];
    // Space slots according to cadence
    const result: PostSlot[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = { ...slots[i] };
      if (cadence.interval === "daily") {
        slot.dayOffset = Math.floor(i / cadence.count);
        slot.time = getOptimalTime(slot.dayOffset + i);
      } else if (cadence.interval === "weekly") {
        slot.dayOffset = Math.floor((i * 7) / cadence.count);
      } else {
        slot.dayOffset = Math.floor((i * 30) / cadence.count);
      }
      result.push(slot);
    }
    return result;
  }, [slots, cadence]);

  const visibleSlots = useMemo(
    () => filteredSlots.filter((s) => !hiddenPosts.has(s.id)),
    [filteredSlots, hiddenPosts]
  );
  const displayedSlots = showAllPosts ? visibleSlots : visibleSlots.slice(0, 6);

  // Auto-generate via 2-Step Vision Pipeline (Analyse → Caption → Validate → Retry)
  useEffect(() => {
    const validSlots = filteredSlots.filter((s) => s.type !== "story" && s.type !== "reel");
    if (validSlots.length === 0 || !images.length) return;
    let cancelled = false;

    // Clear captions for slots that no longer exist
    const slotIds = new Set(validSlots.map((s) => s.id));
    setEditedCaptions((prev) => {
      const next: Record<string, string> = {};
      for (const [id, val] of Object.entries(prev)) {
        if (slotIds.has(id)) next[id] = val;
      }
      return next;
    });

    async function imageToBase64(img: { thumbnailUrl: string }): Promise<string | null> {
      try {
        const res = await fetch(img.thumbnailUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    }

    const generatedOpenings: string[] = [];

    async function generate() {
      // Read onboarding ONCE for all slots
      let ob = "";
      try {
        const raw = localStorage.getItem("flowstream.onboarding");
        if (raw) {
          const data = JSON.parse(raw);
          const sp = data.styleProfile;
          if (sp?.promptAddition) ob = sp.promptAddition;
          else if (sp?.traits) ob = `Stil: ${sp.traits}`;
        }
      } catch { /* ignore */ }

      for (let i = 0; i < validSlots.length; i++) {
        if (cancelled) return;
        const slot = validSlots[i];
        const img = slot.images[0];
        if (!img?.thumbnailUrl) continue;

        const base64 = await imageToBase64(img);
        if (!base64) continue;

        try {
          const res = await fetch("/api/generate-vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              businessType,
              brandName: "",
              slotIndex: i,
              previousOpenings: generatedOpenings,
              styleProfile: ob || undefined,
            }),
          });
          const data = await res.json();
          if (data.content && !cancelled) {
            setEditedCaptions((prev) => ({ ...prev, [slot.id]: data.content }));
            const opening = data.content.split(/[.!?]/)[0].trim().toLowerCase();
            if (opening) generatedOpenings.push(opening);
          }
        } catch { /* skip */ }
      }
    }
    generate();
    return () => { cancelled = true; };
  }, [filteredSlots, tone, businessType, styleProfile, images]);

  const plannedPosts = useMemo<PlannedPost[]>(() => {
    return visibleSlots.map((slot) => {
      const effectiveImages = imageOverrides[slot.id] ?? slot.images;
      const analysisKey = slotAnalysisKey(slot, effectiveImages, slotTones[slot.id] || tone, businessType);
      const analyzed = analyzedSlots[slot.id]?.key === analysisKey ? analyzedSlots[slot.id] : null;
      const caption = editedCaptions[slot.id] ?? analyzed?.caption ?? slot.caption;
      const hashtags = editedHashtags[slot.id] ?? analyzed?.hashtags ?? slot.hashtags;
      const mentions = normalizeMentions(mentionInputs[slot.id] ?? "");

      return {
        id: slot.id,
        scheduledAt: buildScheduledAt(baseDate, slot.dayOffset, slot.time),
        type: slot.type,
        images: effectiveImages,
        caption,
        hashtags,
        mentions,
        description: slot.description
      };
    });
  }, [
    analyzedSlots,
    baseDate,
    businessType,
    editedCaptions,
    editedHashtags,
    imageOverrides,
    mentionInputs,
    slotTones,
    tone,
    visibleSlots
  ]);

  useEffect(() => {
    onPlanChange?.(plannedPosts);
  }, [onPlanChange, plannedPosts]);

  const totalDays = visibleSlots.length > 0 ? Math.max(1, visibleSlots[visibleSlots.length - 1].dayOffset) : 0;

  useEffect(() => {
    let cancelled = false;
    const pending = filteredSlots
      .map((slot) => {
        const effectiveImages = imageOverrides[slot.id] ?? slot.images;
        const effectiveTone = slotTones[slot.id] || tone;
        const key = slotAnalysisKey(slot, effectiveImages, effectiveTone, businessType);
        if (effectiveImages.length === 0 || analyzedSlots[slot.id]?.key === key || analyzingKeys.current.has(key)) return null;
        return { slot, effectiveImages, key, effectiveTone };
      })
      .filter((item): item is { slot: PostSlot; effectiveImages: ProjectImage[]; key: string; effectiveTone: string } => Boolean(item));

    if (pending.length === 0) return;

    // Process ONE slot at a time to avoid rate limiting
    const { slot, effectiveImages, key, effectiveTone } = pending[0];
    analyzingKeys.current.add(key);

    const run = async () => {
      try {
        // If slot was already analyzed (same images, different tone), use fast text-only retone
        const prevAnalyzed = analyzedSlots[slot.id];
        const prevSummary = prevAnalyzed?.summary;
        if (prevSummary && prevAnalyzed?.key !== key) {
          const result = await regenerateCaptionForTone(prevSummary, effectiveTone, businessType, styleProfile);
          if (result) {
            if (cancelled) return;
            setAnalyzedSlots((current) => ({
              ...current,
              [slot.id]: { ...result, summary: prevSummary, key, generator: "deepseek-metadata" as const }
            }));
            return;
          }
          // Fallback: full analysis if retone fails
        }

        const result = await analyzePostSlot(slot, effectiveImages, effectiveTone, businessType, styleProfile);
        if (cancelled) return;
        setAnalyzedSlots((current) => ({
          ...current,
          [slot.id]: { ...result, key }
        }));
      } catch {
        if (cancelled) return;
        setAnalyzedSlots((current) => ({
          ...current,
          [slot.id]: {
            key,
            caption: slot.caption,
            hashtags: slot.hashtags,
            summary: "Fallback aus dem vorbereiteten Postingplan.",
            generator: "metadata"
          }
        }));
      } finally {
        analyzingKeys.current.delete(key);
      }
    };

    run();

    return () => { cancelled = true; };
  }, [analyzedSlots, businessType, filteredSlots, imageOverrides, slotTones, styleProfile, tone]);

  return (
    <div className="posting-plan">
      <div className="posting-plan-header">
        <div>
          <h3>Wie oft soll gepostet werden?</h3>
          <p>Der Plan verteilt die vorbereiteten Beiträge automatisch nach deinem Rhythmus.</p>
        </div>
        <div className="cadence-panel" aria-label="Posting-Häufigkeit">
          <span>Rhythmus</span>
          <div className="cadence-controls">
            <select className="cadence-select" onChange={(e) => setCadence({ ...cadence, interval: e.target.value as Cadence["interval"] })} value={cadence.interval}>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
            </select>
            <select className="cadence-select" onChange={(e) => setCadence({ ...cadence, count: Number(e.target.value) })} value={cadence.count}>
              {[1,2,3,4,5,6,7,10,14,20,30].map((n) => (
                <option key={n} value={n}>{n}×</option>
              ))}
            </select>
          </div>
          <strong>
            {cadence.count} {cadence.count === 1 ? "Post" : "Posts"} {cadence.interval === "daily" ? "pro Tag" : cadence.interval === "weekly" ? "pro Woche" : "pro Monat"}
          </strong>
        </div>
      </div>

      <div className="plan-edit-hint">
        <strong>Jeder Post bleibt bearbeitbar.</strong>
        <span>Über &bdquo;Bearbeiten&ldquo; kannst du Caption, Stil, markierte Accounts, Hashtags, Bildbeschnitt und Bildauswahl ändern.</span>
      </div>
      <div className="feed-grid">
        {displayedSlots.map((slot) => {
          const isExpanded = expandedSlot === slot.id;
          const effectiveImages = imageOverrides[slot.id] ?? slot.images;
          const analysisKey = slotAnalysisKey(slot, effectiveImages, slotTones[slot.id] || tone, businessType);
          const analyzed = analyzedSlots[slot.id]?.key === analysisKey ? analyzedSlots[slot.id] : null;
          const cIdx = carouselIndex[slot.id] ?? 0;
          const currentImg = effectiveImages[cIdx] || effectiveImages[0];
          const caption = editedCaptions[slot.id] ?? analyzed?.caption ?? "Bildanalyse läuft ...";
          const hashtags = editedHashtags[slot.id] ?? analyzed?.hashtags ?? "";
          const mentions = normalizeMentions(mentionInputs[slot.id] ?? "");
          const previewCaption = composePreviewCaption(caption, mentions);
          const analysisLabel = analyzed
            ? analyzed.generator === "openai-vision"
              ? analyzed.summary
              : analyzed.summary
            : "Schnellanalyse der sichtbaren Bildinhalte läuft ...";
          const showAnalysisStatus = !analyzed;
          const formatRatio = getFormat(slot.type);
          const cropPos = cropPositions[slot.id] ?? { x: 50, y: 50 };
          const objectPos = `${cropPos.x}% ${cropPos.y}%`;

          return (
            <div className="feed-post" key={slot.id}>
              <div className="feed-post-header">
                <div className="feed-post-meta">
                  <strong>{formatDate(baseDate, slot.dayOffset)}</strong>
                  <span>{slot.time} Uhr</span>
                </div>
                <span className={`slot-type-badge slot-type-${slot.type}`}>
                  {slot.type === "reel" ? "🎬 Reel" : slot.type === "carousel" ? `🖼️ Carousel` : slot.type === "story" ? "📱 Story" : "📷 Einzelbild"}
                  <span className="slot-format-badge">{slot.type === "reel" || slot.type === "story" ? "9:16" : "4:5"}</span>
                </span>
              </div>

              <div className="feed-preview" style={{ aspectRatio: formatRatio }}>
                {currentImg ? (
                  <>
                    <Image alt="Vorschau" fill src={currentImg.thumbnailUrl} style={{ objectFit: "cover", objectPosition: objectPos }} unoptimized />
                    {slot.type === "carousel" && effectiveImages.length > 1 ? (
                      <>
                        <div className="carousel-dots">
                          {effectiveImages.map((_, i) => (
                            <span className={i === cIdx ? "dot-active" : ""} key={i} />
                          ))}
                        </div>
                        <button
                          className="carousel-arrow carousel-left"
                          onClick={(e) => { e.stopPropagation(); setCarouselIndex({ ...carouselIndex, [slot.id]: Math.max(0, cIdx - 1) }); }}
                          type="button"
                        >‹</button>
                        <button
                          className="carousel-arrow carousel-right"
                          onClick={(e) => { e.stopPropagation(); setCarouselIndex({ ...carouselIndex, [slot.id]: Math.min(effectiveImages.length - 1, cIdx + 1) }); }}
                          type="button"
                        >›</button>
                      </>
                    ) : null}
                  </>
                ) : (
                  <div className="ig-preview-placeholder"><span>Bild auswählen</span></div>
                )}
              </div>

              <div className="feed-caption-preview">
                {showAnalysisStatus ? (
                  <div className={`analysis-status analysis-loading`}>
                    {analysisLabel}
                  </div>
                ) : null}
                <p><strong>Caption</strong> {previewCaption}</p>
                {hashtags ? <p className="feed-hashtags">{hashtags}</p> : null}
              </div>

              <button className="slot-expand-toggle" onClick={() => setExpandedSlot(isExpanded ? null : slot.id)} type="button">
                {isExpanded ? "Schließen" : "Bearbeiten"}
              </button>

              <button
                className="post-delete-text"
                onClick={() => setHiddenPosts(new Set([...hiddenPosts, slot.id]))}
                type="button"
              >
                Post löschen
              </button>

              {isExpanded ? (
                <div className="feed-edit">
                  <div className="slot-tone-picker">
                    <span className="meta">Stil für diesen Post:</span>
                    <div className="tone-picker tone-picker-inline" style={{ marginTop: 6 }}>
                      {[
                        { value: "", label: "🌐 Global" },
                        { value: "authentisch", label: "Authentisch" },
                        { value: "lustig", label: "Lustig" },
                        { value: "emotional", label: "Emotional" },
                        { value: "motivierend", label: "Motivierend" },
                        { value: "modern", label: "Modern" },
                        { value: "kurz", label: "Kurz" },
                        { value: "informativ", label: "Informativ" },
                        { value: "lässig", label: "Lässig" },
                      ].map((tBtn) => {
                        const currentSlotTone = slotTones[slot.id] || "";
                        return (
                          <button
                            className={`tone-chip ${currentSlotTone === tBtn.value ? "is-active" : ""}`}
                            key={tBtn.value}
                            onClick={() => {
                              setSlotTones({ ...slotTones, [slot.id]: tBtn.value });
                            }}
                            type="button"
                          >
                            {tBtn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea aria-label="Caption" className="slot-caption-edit" onChange={(e) => setEditedCaptions({ ...editedCaptions, [slot.id]: e.target.value })} value={caption} />
                  <div className="slot-mentions-field">
                    <label htmlFor={`mentions-${slot.id}`}>Accounts markieren</label>
                    <input
                      id={`mentions-${slot.id}`}
                      onChange={(e) => setMentionInputs({ ...mentionInputs, [slot.id]: e.target.value })}
                      placeholder="@brautpaar @location"
                      value={mentionInputs[slot.id] ?? ""}
                    />
                    <p className="helper">Wird beim Posten automatisch unter die Caption gesetzt.</p>
                  </div>
                  <textarea aria-label="Hashtags" className="slot-hashtags-edit" onChange={(e) => setEditedHashtags({ ...editedHashtags, [slot.id]: e.target.value })} value={hashtags} />
                  <div className="feed-edit-controls">
                    <div className="meta">Bildbeschnitt (ziehen)</div>
                    <p className="helper" style={{ margin: "4px 0 10px", fontSize: ".78rem" }}>
                      Bild anklicken und verschieben um den Ausschnitt anzupassen.
                    </p>
                    <div
                      className="crop-drag-area"
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startPos = cropPositions[slot.id] ?? { x: 50, y: 50 };
                        const onMove = (ev: MouseEvent) => {
                          const dx = ((ev.clientX - startX) / rect.width) * 100;
                          const dy = ((ev.clientY - startY) / rect.height) * 100;
                          setCropPositions({
                            ...cropPositions,
                            [slot.id]: {
                              x: Math.max(0, Math.min(100, startPos.x + dx)),
                              y: Math.max(0, Math.min(100, startPos.y + dy))
                            }
                          });
                        };
                        const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                      style={{
                        aspectRatio: formatRatio,
                        backgroundImage: `url(${currentImg?.thumbnailUrl || ""})`,
                        backgroundSize: "cover",
                        backgroundPosition: objectPos,
                        borderRadius: 10,
                        border: "2px solid var(--accent)",
                        cursor: "grab",
                        maxWidth: 260
                      }}
                    />
                    <div className="meta" style={{ marginTop: 14 }}>Bild tauschen</div>
                    <div className="image-swap-strip">
                      {images.slice(0, 20).map((img) => {
                        const isActive = effectiveImages.some((ei) => ei.id === img.id);
                        return (
                          <button
                            className={`image-swap-thumb ${isActive ? "is-selected" : ""}`}
                            key={img.id}
                            onClick={() => {
                              const next = effectiveImages.map((ei) => ei.id === effectiveImages[cIdx]?.id ? img : ei);
                              if (!isActive) {
                                setImageOverrides({ ...imageOverrides, [slot.id]: next });
                              }
                            }}
                            style={{ backgroundImage: `url(${img.thumbnailUrl})` }}
                            title={img.name}
                            type="button"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!showAllPosts && visibleSlots.length > 6 ? (
        <button
          className="show-more-button show-more-posts"
          onClick={() => setShowAllPosts(true)}
          type="button"
        >
          + {visibleSlots.length - 6} weitere Posts anzeigen
        </button>
      ) : visibleSlots.length > 6 ? (
        <button
          className="show-more-button show-more-posts"
          onClick={() => setShowAllPosts(false)}
          type="button"
        >
          Weniger Posts anzeigen
        </button>
      ) : null}

      <div className="plan-notes">
        <p>
          📊 <strong>{visibleSlots.length} Posts</strong> über {totalDays} {totalDays === 1 ? "Tag" : "Tage"}
          {" · "}{visibleSlots.filter((s) => s.type === "reel").length} Reels{" · "}
          {visibleSlots.filter((s) => s.type === "carousel").length} Carousels{" · "}
          {visibleSlots.filter((s) => s.type === "single").length} Einzelbilder{" · "}
          {visibleSlots.filter((s) => s.type === "story").length} Stories
        </p>
        <p className="helper">
          Formate automatisch: Reels/Stories 9:16 · Carousel & Einzelbild 4:5. Carousel durch Pfeile durchklickbar.
        </p>
      </div>
    </div>
  );
}
