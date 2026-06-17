import {
  projectOutputTypeLabel,
  type ProjectOutputType,
  type WeddingProject
} from "@/lib/types";

export type GenerationContext = {
  project: WeddingProject;
  favoriteCount: number;
  tags: string[];
  extraInstructions: string;
  businessType?: string;
  businessLabel?: string;
  styleProfile?: string;
};

type BusinessFamily = "wedding" | "fitness" | "restaurant" | "product" | "generic";

type ResolvedBusinessContext = {
  businessType: string;
  businessLabel: string;
  family: BusinessFamily;
  isWedding: boolean;
};

function normalizeBusinessType(value?: string) {
  return (value || "").trim().toLowerCase();
}

function humanizeBusinessType(value: string) {
  const labelMap: Record<string, string> = {
    hochzeitsfotograf: "Hochzeitsfotografie",
    portraitfotograf: "Portraitfotografie",
    produktfotograf: "Produktfotografie",
    restaurant: "Restaurant / Café",
    fitness: "Fitness / Coaching",
    immobilien: "Immobilien",
    handwerk: "Handwerk",
    mode: "Mode / Beauty",
    hotel: "Hotel / Unterkunft",
    reise: "Reise / Travel",
    kunst: "Kunst / Kreativ",
    sonstiges: "Sonstiges"
  };

  return labelMap[value] || value || "Projekt";
}

function resolveBusinessContext(context: GenerationContext): ResolvedBusinessContext {
  const businessType = normalizeBusinessType(context.businessType || context.project.businessType || "sonstiges");
  const family: BusinessFamily =
    businessType === "hochzeitsfotograf" ? "wedding"
      : businessType === "fitness" ? "fitness"
      : businessType === "restaurant" ? "restaurant"
      : businessType === "produktfotograf" ? "product"
      : "generic";

  return {
    businessType,
    businessLabel: context.businessLabel || humanizeBusinessType(businessType),
    family,
    isWedding: family === "wedding"
  };
}

function projectSummary({ project, favoriteCount, tags, extraInstructions, businessType, businessLabel }: GenerationContext) {
  return [
    `Branche: ${businessLabel || humanizeBusinessType(normalizeBusinessType(businessType || project.businessType || "sonstiges"))}`,
    project.coupleName ? `Paar: ${project.coupleName}` : "",
    project.weddingDate ? `Datum: ${project.weddingDate}` : "",
    project.location ? `Ort: ${project.location}` : "",
    `Stil: ${project.style || "hochwertig und authentisch"}`,
    `Tonalität: ${project.tone || "persönlich, warm und professionell"}`,
    `Sprache: ${project.language}`,
    `Besonderheiten: ${project.specialNotes || "keine zusätzlichen Angaben"}`,
    `Auswahl: ${favoriteCount} Favoriten`,
    `Bildbereiche: ${tags.length > 0 ? tags.join(", ") : "noch nicht getaggt"}`,
    extraInstructions ? `Zusatzwunsch: ${extraInstructions}` : ""
  ].filter(Boolean).join("\n");
}

export function buildGenerationPrompt(type: ProjectOutputType, context: GenerationContext) {
  const business = resolveBusinessContext(context);
  const instructions: Record<ProjectOutputType, string> = {
    blog: "Schreibe einen emotionalen SEO-tauglichen Blogartikel mit Titel, kurzem Einstieg, drei Zwischenüberschriften und einem natürlichen Abschluss. Erfinde keine Fakten.",
    instagram_caption: "Schreibe eine etwas längere Instagram-Caption mit etwa 80 bis 120 Wörtern, einem persönlichen Gedanken, einer kurzen Frage und 8 bis 10 passenden Hashtags. Keine Floskeln.",
    hashtags: "Erstelle 20 relevante Hashtags als eine kopierbare Zeile. Mische lokale, thematische und zielgruppenbezogene Begriffe. Keine extrem generischen Spam-Tags.",
    reel_ideas: "Entwickle 5 konkrete Reel-Ideen. Pro Idee: Hook, Bildabfolge, Texteinblendung und empfohlene Länge.",
    gallery_description: "Schreibe eine hochwertige Galeriebeschreibung in zwei kurzen Absätzen, emotional aber nicht kitschig.",
    thank_you_email: business.isWedding
      ? "Schreibe eine persönliche Dankesmail an das Hochzeitspaar mit Betreff und natürlichem Abschluss. Keine erfundenen Liefertermine."
      : "Schreibe eine persönliche Dankesmail an den Kunden oder das Projektteam mit Betreff und natürlichem Abschluss. Keine erfundenen Liefertermine.",
    album_story: "Entwirf eine Album-Story in 8 Kapiteln mit kurzen Titeln und Hinweisen, welche Bildarten jeweils passen."
  };

  return [
    `Du bist ein erfahrener Content-Redakteur für ${business.businessLabel}.`,
    business.isWedding
      ? "Grammatik: Verwende ausschließlich korrektes Deutsch. 'Brautpaar' ist sächlich: 'das Brautpaar', 'dem Brautpaar', 'dieses Brautpaar', 'diesem Brautpaar', 'beim Brautpaar'."
      : "Grammatik: Verwende ausschließlich korrektes Deutsch. Schreibe ohne Hochzeitssprache und ohne Brautpaar-Formulierungen, außer das Projekt ist ausdrücklich eine Hochzeit.",
    `Aufgabe: ${projectOutputTypeLabel[type]}.`,
    instructions[type],
    ...(context.styleProfile ? [`WICHTIG - Schreibe im Stil des Nutzers: ${context.styleProfile}`] : []),
    "Schreibe direkt den verwendbaren Inhalt ohne Vorbemerkung oder Analyse.",
    "",
    projectSummary(context)
  ].join("\n");
}

export function generateDemoContent(type: ProjectOutputType, context: GenerationContext) {
  const { project, favoriteCount, tags, extraInstructions } = context;
  const business = resolveBusinessContext(context);
  const tagText = tags.length > 0 ? tags.slice(0, 3).join(", ") : "die vielen kleinen Augenblicke";
  const namedCouple = project.coupleName.trim();
  const place = project.location.trim();
  const locationPhrase = place ? ` in ${place}` : "";
  const businessLabel = business.businessLabel;
  const isWedding = business.isWedding;
  const couple = namedCouple || businessLabel || "diesem Projekt";
  const bizContext = business.family;

  // Detect tone from extra instructions
  const toneLower = extraInstructions.toLowerCase();
  const tone = toneLower.includes("romantisch") ? "romantisch"
    : toneLower.includes("lustig") ? "lustig"
    : toneLower.includes("emotional") ? "emotional"
    : toneLower.includes("modern") ? "modern"
    : toneLower.includes("lässig") ? "lässig"
    : toneLower.includes("kurz") ? "kurz"
    : "authentisch";

  const weddingCaptionVariants: Record<string, string[]> = {
    authentisch: [
      "Manche Momente brauchen keine große Bühne. Genau diese Echtheit zählt, weil darin oft die stärkste Erinnerung steckt. ✨",
      "Echte Gefühle, echte Bilder, echte Erinnerungen. Genau so wirkt ein Tag später wieder greifbar und lebendig.",
      "Weniger Inszenierung, mehr Atmosphäre. Genau so soll es sein, wenn Bilder nicht nur schön aussehen, sondern etwas erzählen.",
      "Wenn ein Tag ruhig und groß zugleich wirkt, entstehen genau diese Bilder, die man auch nach Jahren sofort wieder fühlt.",
      "Zeitlos, nah und unverstellt. So bleibt ein Tag in Erinnerung und verliert auch mit Abstand nichts von seiner Wirkung.",
    ],
    romantisch: [
      "Ein Tag, zwei Herzen, viele kleine Momente für die Ewigkeit. 🤍 Genau in diesen Sekunden entsteht die Art von Romantik, die nie laut sein muss.",
      "Wenn Blicke mehr sagen als Worte, braucht es keine große Erklärung mehr. Dann spricht das Bild für sich.",
      "Liebe im besten Licht. Für heute und für später, damit die Stimmung nicht nur sichtbar, sondern auch spürbar bleibt.",
      "Sanft, nah und voller Gefühl. So wirkt Romantik, wenn sie nicht gemacht, sondern wirklich erlebt ist.",
      "Romantik, die nicht gestellt wirkt, sondern spürbar ist, bleibt immer die schönste Form von Bildsprache.",
    ],
    lustig: [
      "Erst Ja, dann Feiermodus. 🎉 Und genau dazwischen liegen all die kleinen Momente, die am meisten Spaß machen.",
      "Wenn aus einem Hochzeitstag ganz viel gute Laune wird, entstehen Bilder, die nicht nur hübsch, sondern auch lebendig sind.",
      "Lachen inklusive. Und zwar nicht zu knapp, weil echte Stimmung immer die besten Motive liefert.",
      "Der beste Mix aus Gefühl und guter Stimmung. Genau deshalb lohnt sich ein ehrlicher Blick auf den ganzen Tag.",
      "Verheiratet, gefeiert, festgehalten. Mehr braucht es manchmal gar nicht für eine gute Geschichte.",
    ],
    emotional: [
      "Gänsehaut-Momente sehen nicht immer laut aus. Genau darum bleiben sie lange im Kopf und verlieren nichts von ihrer Kraft.",
      "Tränen, Lachen, Nähe. Mehr braucht es oft nicht, damit ein Bild die ganze Stimmung eines Tages trägt.",
      "Dieser Tag fühlt sich in Bildern genauso an, wie er war: echt, intensiv und voller kleiner Zwischentöne.",
      "Manche Augenblicke tragen den ganzen Tag, weil sie leise beginnen und im Rückblick am stärksten wirken.",
      "Wenn Emotionen sichtbar werden, entstehen die stärksten Bilder, ganz ohne Übertreibung.",
    ],
    modern: [
      "Clean, klar und trotzdem voller Gefühl. So wirkt moderne Bildsprache, wenn sie nicht kalt sein soll.",
      "Reduziert im Look, stark in der Wirkung. Genau diese Mischung macht die Serie ruhig und hochwertig.",
      "Moderne Bildsprache für einen Tag mit echter Bedeutung, damit das Ergebnis zeitgemäß und trotzdem nah bleibt.",
      "Weniger Ablenkung, mehr Wirkung. Das ist oft die sauberste Lösung für starke Motive.",
      "Zeitgemäß erzählt, ohne an Wärme zu verlieren. So bleibt der Ton modern und menschlich zugleich.",
    ],
    kurz: [
      "Einfach schön. ✨ Und genau deshalb funktioniert es sofort.",
      "Kurz gesagt: ein besonderer Tag, der sich in wenigen Bildern schon sehr klar anfühlt.",
      "Wenige Worte, viel Gefühl. Das reicht oft völlig aus.",
      "Unaufgeregt. Echt. Gut. Mehr braucht eine gute Bildauswahl nicht.",
      "Genau so bleibt es hängen, weil Klarheit oft mehr Wirkung hat als laute Worte.",
    ],
    motivierend: [
      "Jeder Schritt bis hierher hat sich gelohnt. 💪 Und genau diese Entwicklung sieht man den Bildern oft sofort an.",
      "Konsequenz zeigt sich am Ende in solchen Momenten, weil gute Ergebnisse selten Zufall sind.",
      "Dranbleiben zahlt sich aus, besonders wenn man auf einen klaren Stil und eine saubere Linie setzt.",
      "Ein gutes Bild entsteht selten zufällig. Meist steckt dahinter Geduld, Timing und ein klarer Blick.",
      "Stark bleibt, was ehrlich ist. Genau deshalb wirken solche Serien so nachhaltig.",
    ],
    informativ: [
      "Hier geht es um klare Bildsprache und nachvollziehbare Momente, damit die Geschichte im Kopf sortiert bleibt.",
      "Ein ruhiger Überblick über die wichtigsten Augenblicke des Tages, sauber strukturiert und gut lesbar.",
      "So entsteht eine saubere, stimmige Bildgeschichte, die nicht überfrachtet wirkt.",
      "Präzise, übersichtlich und ohne unnötigen Schnickschnack. Genau deshalb funktioniert sie.",
      "Die Bildauswahl folgt einer klaren, ruhigen Dramaturgie, sodass jeder Abschnitt seinen Platz hat.",
    ],
    "lässig": [
      "Locker, echt und ohne Theater. Genau so darf sich ein entspannter Tag auch anfühlen.",
      "Ein entspannter Tag mit starken Bildern, weil gute Stimmung nie künstlich aussehen muss.",
      "Natürlichkeit gewinnt immer, vor allem dann, wenn das Licht und der Moment zusammenpassen.",
      "Ganz entspannt und trotzdem besonders. Das ist meistens die beste Kombination.",
      "Lässig, aber mit Stil. So bleibt der Ton leicht und trotzdem hochwertig.",
    ]
  };
  const genericCaptionVariants: Record<string, string[]> = {
    authentisch: [
      "Manche Momente brauchen keine große Bühne. Genau diese Echtheit zählt.",
      "Echte Bilder, klare Wirkung und genug Raum für den Moment selbst.",
      "Weniger Inszenierung, mehr Atmosphäre.",
      "Wenn ein Moment ruhig und stark zugleich wirkt, bleibt er hängen.",
      "Zeitlos, nah und unverstellt. So bleibt eine Serie relevant.",
    ],
    romantisch: [
      "Leise Nähe und ein ruhiger Blick machen oft die stärkste Wirkung.",
      "Wenn ein Moment sanft und offen wirkt, bleibt er am längsten im Kopf.",
      "Für die Ewigkeit erzählt, ohne laut zu sein.",
      "Romantik, die nicht gestellt wirkt, funktioniert immer.",
      "Ehrlich gefühlte Szenen haben oft die schönste Ausstrahlung.",
    ],
    lustig: [
      "Ein bisschen Chaos gehört dazu. Genau das macht den Moment oft stark.",
      "Gute Stimmung lässt sich nicht planen, aber sehr gut festhalten.",
      "Locker bleiben und trotzdem sauber erzählen.",
      "Der beste Mix aus Spaß und echter Energie.",
      "Ungeplant ist manchmal einfach besser.",
    ],
    emotional: [
      "Echte Emotionen sehen nicht immer laut aus, bleiben aber oft am längsten.",
      "Mehr braucht es oft nicht, damit ein Bild die Stimmung trägt.",
      "Dieser Moment fühlt sich in Bildern genauso an, wie er war.",
      "Manche Augenblicke tragen die ganze Geschichte.",
      "Wenn Emotionen sichtbar werden, entsteht die stärkste Wirkung.",
    ],
    modern: [
      "Clean, klar und trotzdem voller Gefühl.",
      "Reduziert im Look, stark in der Wirkung.",
      "Weniger Ablenkung, mehr Wirkung.",
      "Zeitgemäß erzählt, ohne an Wärme zu verlieren.",
      "Moderne Bildsprache, die nicht kalt wirken muss.",
    ],
    kurz: [
      "Einfach schön. Und genau deshalb funktioniert es sofort.",
      "Kurz gesagt: ein starker Moment.",
      "Wenige Worte, viel Gefühl.",
      "Unaufgeregt. Echt. Gut.",
      "Genau so bleibt es hängen.",
    ],
    motivierend: [
      "Jeder Schritt bis hierher hat sich gelohnt.",
      "Konsequenz zeigt sich am Ende in solchen Momenten.",
      "Dranbleiben zahlt sich aus.",
      "Ein gutes Bild entsteht selten zufällig.",
      "Stark bleibt, was ehrlich ist.",
    ],
    informativ: [
      "Hier geht es um klare Bildsprache und nachvollziehbare Momente.",
      "Ein ruhiger Überblick über die wichtigsten Augenblicke.",
      "So entsteht eine saubere, stimmige Bildgeschichte.",
      "Präzise, übersichtlich und ohne unnötigen Schnickschnack.",
      "Die Bildauswahl folgt einer klaren, ruhigen Dramaturgie.",
    ],
    "lässig": [
      "Locker, echt und ohne Theater.",
      "Ein entspannter Look mit starken Bildern.",
      "Natürlichkeit gewinnt immer.",
      "Ganz entspannt und trotzdem besonders.",
      "Lässig, aber mit Stil.",
    ]
  };

  // Business-aware captions in proper German
  // Business-aware captions in proper German
  const bizCaptions: Record<string, Record<string, string[]>> = {
    fitness: {
      authentisch: [
        `Konsequenz zeigt sich in jedem Bild. 💪\n\nDer Weg ist das Ziel – und genau das sieht man auf diesen Aufnahmen.\n\n#fitness #training #consistency`,
        `Kein Filter, kein Photoshop, nur echte Arbeit. Diese Bilder zeigen den Moment, auf den es ankommt.\n\n#fitfam #real #workout`,
        `Fortschritt passiert nicht über Nacht. Aber diese Bilder beweisen: Jeder einzelne Schritt lohnt sich.\n\n#fitnessjourney #motivation #progress`,
      ],
      motivierend: [
        `Dein Training. Deine Regeln. Dein Moment.\n\nMach heute den ersten Schritt – morgen dankst du dir selbst. 💯\n\n#glaubandich #fitness #startnow`,
        `Wer aufhört, besser zu werden, hat aufgehört, gut zu sein.\n\nWas ist dein nächstes Ziel? Schreib es in die Kommentare! 👇\n\n#noplanb #training #disziplin`,
      ],
      kurz: [
        `Keine Ausreden. Nur Ergebnisse. 💪\n\n#fitness`,
      ],
    },
    restaurant: {
      authentisch: [
        `Es geht nicht nur ums Essen. Es geht um den ganzen Abend – die Atmosphäre, die Gesellschaft, der Genuss. 🍽️\n\n#gastro #genuss #qualität`,
        `Handwerk schmeckt man. Jedes Gericht erzählt eine Geschichte – und diese Bilder zeigen den Anfang.\n\n#restaurant #küche #leidenschaft`,
      ],
      informativ: [
        `Unsere Philosophie: Frische Zutaten, ehrliche Zubereitung, kein Schnickschnack.\n\nKommt vorbei und überzeugt euch selbst. Wir freuen uns auf euch! 😊\n\n#gastro #regional #ehrlich`,
      ],
    },
    product: {
      authentisch: [
        `Gute Produktfotos verkaufen nicht nur. Sie erzählen, wofür du stehst.\n\n#produktfotografie #detail #qualität`,
        `Licht, Komposition, Timing – drei Dinge, die ein gutes Produktbild ausmachen.\n\n#produktfoto #ecommerce #business`,
      ],
      modern: [
        `Weniger ist mehr. Klare Linien, starke Aussage.\n\n#productphotography #clean #minimal`,
      ],
    },
    generic: {
      authentisch: [
        `Gute Bilder sind die beste Visitenkarte. Egal in welcher Branche. ✨\n\n#business #content #marketing`,
        `Deine Arbeit verdient die beste Bühne. Diese Bilder zeigen, was du kannst.\n\n#unternehmen #qualität`,
      ],
      modern: [
        `Klare Ansage. Kein Blabla. Dein Business in einem Bild.\n\n#business #modern`,
      ],
    },
    wedding: {},
  };

  // Merge business-aware captions
  const bizTone = (bizCaptions[bizContext] && bizCaptions[bizContext][tone]) ? tone : "authentisch";
  const overrides = bizCaptions[bizContext]?.[bizTone];
  const baseCaptionVariants = isWedding ? weddingCaptionVariants : genericCaptionVariants;
  const variants = overrides && overrides.length > 0
    ? overrides
    : baseCaptionVariants[bizTone] ?? baseCaptionVariants.authentisch;
  const seed = Date.now();
  const pickedCaption = variants[seed % variants.length] ?? baseCaptionVariants.authentisch[0];

  const templates: Record<ProjectOutputType, string> = {
    blog: isWedding
      ? `# ${namedCouple || "Eine Hochzeit in Bildern"}\n\nManche Hochzeitstage fühlen sich vom ersten Moment an leicht an. Bei ${couple} war genau diese ruhige, persönliche Energie spürbar und sie hat den ganzen Tag getragen.`
      : `# ${namedCouple || businessLabel || "Ein Projekt in Bildern"}\n\nManche Projekte fühlen sich vom ersten Moment an leicht an. Bei ${couple} war genau diese ruhige, persönliche Energie spürbar und hat die Serie getragen.`,
    instagram_caption: pickedCaption,
    hashtags: isWedding
      ? `#hochzeitsfotografie #hochzeitsreportage #hochzeitsinspiration #weddingphotography #weddingstory #brautpaar #hochzeitsbilder #echtemomente #emotionalefotografie #hochzeitsliebe #weddinginspiration #hochzeitsfotograf #storytelling #authentischefotografie #hochzeit2026 #braut2026 #verlobt #heiraten #${project.language === "DE" ? "hochzeit" : "wedding"} #hochzeitsmomente #lovestory #weddingday #echtegefühle #brautpaarliebe`
      : `#contentcreation #branding #businessfotografie #storytelling #sichtbarkeit #visuals #marketing #socialmedia #authentisch #bildsprache #kommunikation #projektcontent #brandpresence #contentstrategie #postplanung`,
    reel_ideas: isWedding
      ? `## 1. Der Tag in 12 Sekunden\nHook: „Ein ganzer Hochzeitstag in 12 Sekunden“\nBildabfolge: Location, Details, Trauung, Paarshooting, Party\nTexteinblendung: „So fühlte sich ${place} an“\nLänge: 12–15 Sekunden\n\n## 2. Die leisen Momente\nHook: „Die Bilder, die man am Hochzeitstag selbst kaum bemerkt“\nBildabfolge: Hände, Blicke, Gäste, Umarmungen\nTexteinblendung: „Dazwischen passiert die echte Geschichte“\nLänge: 15–20 Sekunden\n\n## 3. Vom Getting Ready zur Party\nHook: „Von ruhig bis völlig losgelöst“\nBildabfolge: chronologischer Spannungsbogen\nTexteinblendung: Uhrzeiten oder Tagesphasen\nLänge: 18–25 Sekunden\n\n## 4. Favoriten des Fotografen\nHook: „${favoriteCount || 5} Bilder, die ich sofort wieder wählen würde“\nBildabfolge: ausgewählte Favoriten mit kurzen Pausen\nTexteinblendung: je Bild ein Grund\nLänge: 15–25 Sekunden\n\n## 5. Eine Hochzeit, drei Gefühle\nHook: „Vorfreude. Nähe. Eskalation.“\nBildabfolge: drei klar getrennte Kapitel\nTexteinblendung: jeweils ein Wort\nLänge: 10–15 Sekunden`
      : `## 1. Der Ablauf in 12 Sekunden\nHook: „Ein ganzes Projekt in 12 Sekunden“\nBildabfolge: Auftakt, Details, Hauptmoment, Ergebnis, Abschluss\nTexteinblendung: „So fühlte sich ${businessLabel} an“\nLänge: 12–15 Sekunden\n\n## 2. Die ruhigen Frames\nHook: „Die Bilder, die man im Alltag leicht übersieht“\nBildabfolge: kleine Gesten, Umgebung, Zwischenschritte, Nähe\nTexteinblendung: „Dazwischen passiert die eigentliche Story“\nLänge: 15–20 Sekunden\n\n## 3. Von Start bis Finale\nHook: „Von ruhig bis stark“\nBildabfolge: chronologischer Spannungsbogen\nTexteinblendung: Uhrzeiten oder Projektphasen\nLänge: 18–25 Sekunden\n\n## 4. Favoriten der Serie\nHook: „${favoriteCount || 5} Bilder, die ich sofort wieder wählen würde“\nBildabfolge: ausgewählte Favoriten mit kurzen Pausen\nTexteinblendung: je Bild ein Grund\nLänge: 15–25 Sekunden\n\n## 5. Drei Bilder, drei Aussagen\nHook: „Klar. Direkt. Wirksam.“\nBildabfolge: drei klar getrennte Kapitel\nTexteinblendung: jeweils ein Wort\nLänge: 10–15 Sekunden`,
    gallery_description: isWedding
      ? `${namedCouple ? `${namedCouple} feierten` : "Das Brautpaar feierte"} den Hochzeitstag${locationPhrase} mit einer Atmosphäre, die ${project.style || "persönlich und zeitlos"} wirkte. Die Reportage verbindet die großen Stationen des Tages mit den stillen Momenten dazwischen.\n\nIm Mittelpunkt stehen echte Begegnungen, Nähe und die Details, die diesen Tag unverwechselbar machen. So bleibt eine Bildgeschichte, die nicht nur zeigt, was passiert ist, sondern wieder spürbar macht, wie es war.`
      : `${businessLabel || "Das Projekt"} wurde mit einer Atmosphäre umgesetzt, die ${project.style || "klar und hochwertig"} wirkte. Die Bildstrecke verbindet die wichtigsten Stationen mit den ruhigen Momenten dazwischen.\n\nIm Mittelpunkt stehen echte Eindrücke, klare Bildsprache und die Details, die dem Auftritt Charakter geben. So bleibt eine Bildgeschichte, die nicht nur zeigt, was passiert ist, sondern auch, wie es sich angefühlt hat.`,
    thank_you_email: isWedding
      ? `Betreff: Danke für euer Vertrauen\n\n${namedCouple ? `Liebe ${namedCouple}` : "Liebes Brautpaar"},\n\nvielen Dank, dass ich euren Hochzeitstag${locationPhrase} begleiten durfte. Es war schön zu erleben, wie persönlich und stimmig ihr diesen Tag gestaltet habt.\n\nBeim Sichten der Bilder sind bereits viele starke Momente dabei, besonders aus den Bereichen ${tagText}. Ich freue mich darauf, daraus eure zusammenhängende Hochzeitsgeschichte fertigzustellen.\n\nHerzliche Grüße\nTobias`
      : `Betreff: Danke für dein Vertrauen\n\n${namedCouple ? `Hallo ${namedCouple}` : `Hallo ${businessLabel}`},\n\nvielen Dank, dass ich euer Projekt${locationPhrase} begleiten durfte. Es war schön zu erleben, wie stimmig und klar ihr diesen Auftritt gestaltet habt.\n\nBeim Sichten der Bilder sind bereits viele starke Momente dabei, besonders aus den Bereichen ${tagText}. Ich freue mich darauf, daraus eine zusammenhängende Bildgeschichte fertigzustellen.\n\nHerzliche Grüße\nTobias`,
    album_story: isWedding
      ? `## 1. Ankommen\nLocation, Umgebung und erste Details als ruhiger Einstieg.\n\n## 2. Vorfreude\nGetting Ready, Kleidung, Hände und erwartungsvolle Blicke.\n\n## 3. Begegnung\nFirst Look oder die ersten Reaktionen bei der Trauung.\n\n## 4. Das Versprechen\nZentrale Momente der Trauung, Ringe und Gratulationen.\n\n## 5. Nähe\nPaarbilder mit einem Wechsel aus ruhigen und lebendigen Motiven.\n\n## 6. Gemeinschaft\nFamilie, Freunde, Gruppen und spontane Begegnungen.\n\n## 7. Feiern\nDinner, Reden, Lachen und die Energie des Abends.\n\n## 8. Finale\nParty, ein starkes Schlussbild und ein ruhiger visueller Ausklang.`
      : `## 1. Auftakt\nDer erste visuelle Eindruck und die wichtigsten Rahmenbedingungen.\n\n## 2. Aufbau\nDetails, Vorbereitung und die Elemente, die die Serie tragen.\n\n## 3. Hauptmoment\nDie stärksten Bilder und der klarste visuelle Fokus.\n\n## 4. Zwischentöne\nMomente, die den Ablauf menschlich und lebendig machen.\n\n## 5. Wirkung\nDie Bilder, die hängen bleiben und den Auftritt abrunden.\n\n## 6. Umfeld\nUmgebung, Kontext und alles, was die Serie glaubwürdig macht.\n\n## 7. Energie\nBewegung, Dynamik oder Interaktion, je nach Motiv.\n\n## 8. Finale\nEin klares Schlussbild und ein ruhiger Abschluss der Geschichte.`
  };

  return templates[type];
}
