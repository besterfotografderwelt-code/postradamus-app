import type { ProjectImage } from "@/lib/types";
import type { PostSlot } from "./posting-plan.types";
import { imagePriorityScore, normalizeTone } from "./posting-plan.helpers";
import {
  weddingHashtagSets,
  fitnessHashtags,
  restaurantHashtags,
  productHashtags,
  genericHashtagSets,
  weddingStoryCaptions,
  genericStoryCaptions,
  weddingStoryCaptionsDefault,
} from "./posting-plan.data";

export function generatePostSlots(
  images: ProjectImage[],
  tone: string,
  businessType = "sonstiges"
): PostSlot[] {
  const normalizedBusinessType = businessType.trim().toLowerCase();
  const isWeddingBusiness = normalizedBusinessType === "hochzeitsfotograf";
  const all = [...images].sort(
    (a, b) => imagePriorityScore(b) - imagePriorityScore(a)
  );
  if (all.length === 0) return [];

  const slots: PostSlot[] = [];
  const usedImages = new Set<string>();
  let idx = 0;

  function pick(n: number) {
    return all.filter((img) => !usedImages.has(img.id)).slice(0, n);
  }
  function mark(imgs: ProjectImage[]) {
    imgs.forEach((img) => usedImages.add(img.id));
  }

  const baseHashtags = isWeddingBusiness
    ? weddingHashtagSets
    : normalizedBusinessType === "fitness"
      ? fitnessHashtags
      : normalizedBusinessType === "restaurant"
        ? restaurantHashtags
        : normalizedBusinessType === "produktfotograf"
          ? productHashtags
          : genericHashtagSets;

  function nextCaption() {
    return "";
  }

  const toneKey = normalizeTone(tone);
  const activeStoryCaptions = (toneKey && weddingStoryCaptions[toneKey])
    ? weddingStoryCaptions[toneKey]
    : isWeddingBusiness
      ? weddingStoryCaptionsDefault
      : genericStoryCaptions;

  function nextStoryCaption() {
    return activeStoryCaptions[idx++ % activeStoryCaptions.length];
  }

  // 1. Reel opening
  const focusTags = isWeddingBusiness
    ? ["Trauung", "Party", "Getting Ready"]
    : normalizedBusinessType === "fitness"
      ? ["Workout", "Transformation", "Studio", "Motivation"]
      : normalizedBusinessType === "restaurant"
        ? ["Gerichte", "Interior", "Team", "Zubereitung"]
        : normalizedBusinessType === "produktfotograf"
          ? ["Weißer Hintergrund", "Lifestyle", "Detail", "Verpackung", "Flatlay", "Werbung"]
          : ["Studio", "Outdoor", "Business", "Familie", "Kinder", "Bewerbung", "Arbeit", "Projekt", "Detail", "Details"];
  const reelImgs = all.filter((img) =>
    img.tags.some((t) => focusTags.includes(t))
  );
  if (reelImgs.length >= 3) {
    const imgs = reelImgs
      .filter((img) => !usedImages.has(img.id))
      .slice(0, 4);
    mark(imgs);
    slots.push({
      id: "reel",
      dayOffset: 1,
      time: "19:30",
      type: "reel",
      images: imgs,
      description: "Reel: Stimmung & erste Eindrücke",
      caption: nextCaption(),
      hashtags: baseHashtags[idx % baseHashtags.length],
    });
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
      description: isWeddingBusiness
        ? "Story: Hinter den Kulissen"
        : "Story: Ein Blick hinter die Kulissen",
      caption: nextStoryCaption(),
      hashtags: "",
    });
  }

  // 3. Carousel of favorites
  const favorites = all.filter((img) => img.isFavorite);
  const favImgs = favorites.filter((img) => !usedImages.has(img.id));
  if (favImgs.length >= 2) {
    const carouselImgs = favImgs.slice(0, Math.min(8, favImgs.length));
    mark(carouselImgs);
    slots.push({
      id: "carousel-fav",
      dayOffset: 3,
      time: "13:00",
      type: "carousel",
      images: carouselImgs,
      description: "Carousel: Die schönsten Momente",
      caption: nextCaption(),
      hashtags: baseHashtags[idx % baseHashtags.length],
    });
  }

  // 4. All remaining images as posts
  const remaining = all.filter((img) => !usedImages.has(img.id));
  const seen = new Set(usedImages);
  const uniqueRemaining = remaining.filter((img) => {
    if (seen.has(img.id)) return false;
    seen.add(img.id);
    return true;
  });

  let postDay = 5;
  let i = 0;
  while (i < uniqueRemaining.length) {
    const isMulti =
      uniqueRemaining.length > 10 &&
      i % 5 === 0 &&
      i + 2 < uniqueRemaining.length;
    const count = isMulti ? 3 : 1;
    const imgs = uniqueRemaining.slice(i, i + count);
    mark(imgs);
    const type: PostSlot["type"] = isMulti ? "carousel" : "single";
    const imgName =
      imgs[0]?.name?.replace(/\.(jpg|jpeg)$/i, "") || `Bild ${i + 1}`;
    const imgTags = imgs[0]?.tags || [];
    const isCTA = i % 4 === 0;

    const toneVariants = toneCaptionVariants(
      tone,
      isWeddingBusiness,
      imgTags,
      imgName,
      isCTA,
      normalizedBusinessType
    );
    const foundCaption = toneVariants[Math.floor(Math.random() * toneVariants.length)];

    slots.push({
      id: `post-${i}`,
      dayOffset: postDay,
      time: getTimeForIndex(i),
      type,
      images: imgs,
      description: `${
        type === "single" ? "Bild" : "Carousel"
      }: ${imgName}`,
      caption: foundCaption,
      hashtags: baseHashtags[i % baseHashtags.length],
    });

    i += count;
    postDay += isMulti ? 3 : 2;
  }

  return slots;
}

function getTimeForIndex(index: number): string {
  return ["08:00", "13:00", "19:30"][index % 3];
}

function toneCaptionVariants(
  tone: string,
  isWedding: boolean,
  imgTags: string[],
  imgName: string,
  isCTA: boolean,
  businessType: string
): string[] {
  const toneKey = normalizeTone(tone);
  const toneSuffix = getToneSuffix(toneKey);

  const byWeddingTag =
    isWedding && imgTags.includes("Trauung")
      ? [
          `Wenn aus einem Ja-Wort tausend Erinnerungen werden, entsteht genau diese Art von Bild. Echt, nah und voller Bedeutung, damit der Moment später wieder ganz präsent wird. ${imgName}.`,
        ]
      : isWedding && imgTags.includes("Paarshooting")
        ? [
            `Zwei Menschen, ein Moment, pure Magie. Dieses Bild zeigt, was Liebe wirklich bedeutet, wenn alles andere kurz leiser wird. ✨`,
          ]
        : isWedding && imgTags.includes("Party")
          ? [
              `Tanzfläche voll, Stimmung auf dem Höhepunkt. Genau so muss eine Feier sich anfühlen. 🕺💃`,
            ]
          : isWedding
            ? [
                `Hochzeitstag in all seiner Schönheit festgehalten, mit dem besonderen Blick für alles, was zählt.`,
              ]
            : businessType === "fitness"
              ? [
                  `Kein Filter, keine Ausreden, nur echte Fortschritte. Genau so entsteht Veränderung. 💪`,
                  `Training ist der beste Beweis, dass Disziplin sich lohnt. Jeden Tag ein Stück näher.`,
                ]
              : businessType === "restaurant"
                ? [
                    `Handwerk, Genuss und eine Atmosphäre, die bleibt. Genau das macht diesen Ort besonders.`,
                    `Von der Zubereitung bis zum Teller – hier steckt Qualität in jedem Detail.`,
                  ]
                : [
                    `Dieses Bild zeigt mehr als nur einen Moment. Es erzählt die Geschichte dahinter.`,
                    `Echt, direkt und ohne unnötige Inszenierung. Genau so halten wir es fest.`,
                  ];

  if (toneSuffix.length === 0) return byWeddingTag;

  const withCTA = isCTA
    ? [
        `Welcher Moment hat euch am meisten berührt? 💬 Schreibt es in die Kommentare – wir sind gespannt!`,
      ]
    : [];

  return [...withCTA, ...byWeddingTag, ...toneSuffix];
}

function getToneSuffix(toneKey: string): string[] {
  switch (toneKey) {
    case "lustig":
      return [
        "Mit null Langeweile und einem dicken Grinsen im Feed. 😂🎉",
        "Gute Laune ist ansteckend. Wir sind heute der Beweis dafür.",
      ];
    case "emotional":
      return [
        "Dieser Moment geht unter die Haut, weit tiefer als Worte je könnten. ❤️",
        "Manche Sekunden tragen mehr Gefühl als ganze Tage.",
      ];
    case "motivierend":
      return [
        "Aufgeben ist keine Option. Der nächste Schritt beginnt genau hier. 💪🔥",
        "Disziplin schlägt Motivation jeden Tag. Heute wieder bewiesen.",
      ];
    case "romantisch":
      return [
        "Mit ganz viel Herz und einem Blick, der mehr sagt als tausend Worte. 🤍",
        "Leise Nähe, große Gefühle. Genau so fühlt sich dieser Moment an.",
      ];
    case "modern":
      return [
        "Clean. Direct. No bullshit. So halten wir das.",
        "Weniger Gelaber, mehr Style. Punkt.",
      ];
    case "kurz":
      return ["Genau so.", "Mehr braucht's nicht."];
    case "informativ":
      return [
        "Die Fakten zählen, nicht die Verpackung. Hier sind sie, klar und sauber.",
        "Kein Hype, kein Blabla. Nur das, was wirklich zählt.",
      ];
    case "lässig":
      return [
        "Ganz easy. Kein Grund, sich zu verstellen oder groß aufzutrumpfen.",
        "So läuft's bei uns: entspannt, ehrlich, ohne Schnickschnack.",
      ];
    default:
      return [];
  }
}
