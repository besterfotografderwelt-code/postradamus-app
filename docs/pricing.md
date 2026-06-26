# FeedFlow AI Pricing Draft

Stand: 2026-06-16

## Empfehlung

| Paket | Preis | Limit | Zielgruppe |
| --- | ---: | ---: | --- |
| Starter | 24,90 EUR / Monat | 75 Bilder / Monat | kleine Accounts, unregelmäßige Poster |
| Growth | 49,90 EUR / Monat | 150 Bilder / Monat | aktive Selbstständige, Fotografen, Studios |
| Studio | 129,90 EUR / Monat | unlimitiert mit Fair-Use | Teams, Agenturen, große Accounts |

## Kalkulationslogik

Der reine Text-Tokenpreis ist nicht der Hauptkostentreiber. Je nach Modell liegen gute kleine OpenAI-Modelle im Bereich von grob 0,75 USD pro 1M Input-Tokens und 4,50 USD pro 1M Output-Tokens für `gpt-5.4-mini`, beziehungsweise darunter bei günstigeren Modellen. Selbst mit mehreren Textausgaben pro Bild bleibt der reine Textanteil meist niedrig.

Trotzdem braucht FeedFlow eine deutliche Marge, weil pro zahlendem Nutzer mehr anfällt als Tokens:

- Bildanalyse und optional Vision-Modelle
- Bildspeicher und Transfervolumen
- Datenbank, Auth, Hosting und Background-Jobs
- Zahlungsgebühren
- Support, Fehlversuche und erneute Generierungen
- Missbrauchspuffer bei sehr hoher Nutzung
- Produktentwicklung und Gewinnmarge

## Warum kein echtes Unlimited?

Echtes Unlimited ist bei KI-Produkten riskant, weil einzelne Power-User oder automatisierte Nutzung die Marge zerstören können. Das Studio-Paket sollte deshalb als "unlimitiert mit Fair-Use" verkauft werden. Intern sollte ein fairer Richtwert definiert werden, zum Beispiel 750 bis 1.000 Bilder pro Monat, mit manueller Prüfung bei auffälliger Nutzung.

## Einschätzung

24,90 EUR / 49,90 EUR / 129,90 EUR ist als erste Preisarchitektur plausibel:

- Starter hat genug Marge, ist aber niedrig genug für kleine Betriebe.
- Growth ist der eigentliche Zielplan und sollte prominent empfohlen werden.
- Studio schützt durch den hohen Preis und Fair-Use vor unkontrollierter Nutzung.

Vor dem öffentlichen Launch sollten die realen Kosten aus Testnutzung gemessen werden: durchschnittliche Bilder pro Projekt, KI-Aufrufe pro Bild, Speicher pro Kunde, Fehlversuche und Supportaufwand.
