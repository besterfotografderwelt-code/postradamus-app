export type CaptionStyleContext = {
  tone?: string;
  styleProfile?: string;
};

function normalizedTone(tone?: string) {
  return (tone || "authentisch").trim().toLowerCase();
}

export function captionStyleContract({ tone, styleProfile }: CaptionStyleContext) {
  const selectedTone = normalizedTone(tone);
  const personalStyle = styleProfile?.trim();
  const personalStyleRule = personalStyle
    ? selectedTone === "authentisch"
      ? [
          `PERSÖNLICHER ONBOARDING-STIL (höchste Priorität): ${personalStyle}`,
          "Im Stil AUTHENTISCH imitierst du dieses Schreibprofil konsequent: Perspektive, Wortwahl, Satzlänge, Direktheit, Humor, Emoji- und Frageverhalten.",
          "Allgemeine Social-Media-Muster sind nachrangig. Der Text soll wie ein neuer Text derselben Person klingen."
        ].join("\n")
      : [
          `Persönliche Markenstimme als Grundton: ${personalStyle}`,
          `Der gewählte Stil ${selectedTone.toUpperCase()} verändert diese Markenstimme jedoch deutlich und hat bei Aufbau, Rhythmus und Intensität Vorrang.`
        ].join("\n")
    : "";

  const contracts: Record<string, string[]> = {
    authentisch: [
      "STILVERTRAG AUTHENTISCH:",
      "- Schreibe wie eine konkrete Person, nicht wie eine Werbeagentur.",
      "- Nutze eine persönliche Beobachtung, ehrliche Einschätzung oder kleine Alltagsszene.",
      "- Satzrhythmus natürlich gemischt; weder pathetisch noch demonstrativ witzig.",
      "- Keine Werbesuperlative, kein Kitsch, keine künstliche Pointe.",
      "- 55 bis 95 Wörter, sofern das Onboarding-Profil keine klar andere Länge vorgibt.",
      personalStyleRule || "- Nahbar, direkt und ungekünstelt schreiben."
    ],
    lustig: [
      "STILVERTRAG LUSTIG:",
      "- Der Text braucht eine erkennbare komische Idee: Pointe, Selbstironie, spielerische Übertreibung oder überraschenden Vergleich.",
      "- Beginne frech oder unerwartet. Kurze Sätze und bewusstes Timing.",
      "- Verwende 1 bis 3 passende Emojis als Teil der Pointe.",
      "- Vermeide gefühlvolle, romantische und pathetische Sätze vollständig.",
      "- 35 bis 70 Wörter. Die Caption muss laut gelesen eindeutig humorvoll wirken.",
      personalStyleRule
    ],
    emotional: [
      "STILVERTRAG EMOTIONAL:",
      "- Erzähle von innerer Bedeutung, Nähe oder Erinnerung statt nur sichtbare Dinge aufzuzählen.",
      "- Ruhiger Rhythmus mit einem kurzen, starken Schlusssatz.",
      "- Verwende konkrete Gefühle, aber keine kitschigen Standardbilder.",
      "- Keine Witze, kein Werbeton, keine englischen Trendwörter.",
      "- 70 bis 115 Wörter. Der Text darf verletzlich und persönlich sein.",
      personalStyleRule
    ],
    motivierend: [
      "STILVERTRAG MOTIVIEREND:",
      "- Baue den Text als Bewegung auf: Ausgangspunkt → Hürde → nächster konkreter Schritt.",
      "- Sprich die Leserin oder den Leser direkt mit du/dein an.",
      "- Aktiv, energisch und handlungsorientiert; überwiegend kurze Sätze.",
      "- Beende mit einer klaren Aufforderung oder Herausforderung.",
      "- 45 bis 80 Wörter. Keine romantische Rückschau und kein passives Staunen.",
      personalStyleRule
    ],
    romantisch: [
      "STILVERTRAG ROMANTISCH:",
      "- Schreibe zärtlich und bildhaft über Verbindung, Nähe und feine Gesten.",
      "- Weicher, fließender Satzrhythmus; ein dezentes 🤍 ist erlaubt.",
      "- Konzentriere dich auf ein intimes sichtbares Detail statt auf große Behauptungen.",
      "- Kein Humor, kein Business-Sprech, keine englischen Trendwörter.",
      "- 65 bis 105 Wörter. Gefühlvoll, aber ohne Märchen-, Magie- oder Ewigkeit-Floskeln.",
      personalStyleRule
    ],
    modern: [
      "STILVERTRAG MODERN & EDGY:",
      "- Schreibe minimalistisch, selbstbewusst und pointiert.",
      "- 20 bis 50 Wörter. Viele kurze Sätze oder Satzfragmente. Maximal ein längerer Satz.",
      "- Ein kurzer englischer Einschub ist möglich, aber nicht Pflicht.",
      "- Keine gefühlvolle Erklärung, kein Kitsch, keine klassischen Instagram-Floskeln.",
      "- Starker erster Satz. Gerne ein bewusster Kontrast oder eine klare Haltung.",
      personalStyleRule
    ],
    kurz: [
      "STILVERTRAG KURZ:",
      "- Höchstens 28 Wörter und höchstens 3 Sätze.",
      "- Eine konkrete Aussage, kein Vorwort, keine Erklärung und keine Wiederholung.",
      "- Keine Füllwörter und keine Zusammenfassung des gesamten Motivs.",
      personalStyleRule
    ],
    informativ: [
      "STILVERTRAG INFORMATIV:",
      "- Vermittle einen konkreten Nutzen, Fakt, Tipp oder nachvollziehbaren Prozess.",
      "- Aufbau: klare Kernaussage → 2 bis 3 konkrete Informationen → praktische Konsequenz.",
      "- Sachlich, präzise und verständlich. Keine Gefühlsdramaturgie und keine poetischen Bilder.",
      "- 75 bis 120 Wörter. Fachbegriffe nur, wenn sie erklärt oder branchenüblich sind.",
      "- Ein CTA darf gezielt zum Speichern oder zu einer sachlichen Frage einladen.",
      personalStyleRule
    ],
    lässig: [
      "STILVERTRAG LÄSSIG:",
      "- Schreibe wie eine spontane Nachricht an einen guten Freund.",
      "- Umgangssprachlich, entspannt, gern mit einem kleinen Nebensatz oder trockenen Kommentar.",
      "- Mittlere Satzlänge, keine Hochglanz-Werbesprache und kein tiefes Pathos.",
      "- 40 bis 75 Wörter. Ein dezentes Emoji ist möglich.",
      personalStyleRule
    ]
  };

  return (contracts[selectedTone] || contracts.authentisch).filter(Boolean).join("\n");
}

export function styleContrastRule(tone?: string) {
  const selectedTone = normalizedTone(tone);
  return [
    `Der Stil ${selectedTone.toUpperCase()} ist eine harte Vorgabe, keine lose Stimmungsempfehlung.`,
    "Wenn derselbe Bildinhalt in einem anderen Stil geschrieben würde, müssten Einstieg, Satzbau, Länge, Wortwahl und Schluss deutlich anders sein.",
    "Prüfe den Entwurf vor der Ausgabe: Ist der gewählte Stil ohne Stilbezeichnung eindeutig erkennbar? Falls nein, schreibe ihn neu."
  ].join("\n");
}
