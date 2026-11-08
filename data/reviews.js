/* ReiseGlück Reisebüro (Demo) – Beispielbewertungen
   ALLE Einträge sind fiktive Demo-Beispiele (erfundene Vornamen, keine echten Personen).
   In einer echten Version hier die geprüften Bewertungen des Reisebüros einsetzen
   (z. B. Export aus Google oder Trustpilot) – Format bleibt gleich.
   Kein Review-/AggregateRating-Markup verwenden, solange es Demo-Daten sind.

   typ: "pauschal" | "familie" | "staedtereise" | "kreuzfahrt" | "service"
*/
window.RG_BEWERTUNGEN = [
  { id: 'd1', name: 'Mara', typ: 'familie', sterne: 5, datum: '2026-09-14', titel: 'Alles war vorbereitet', text: 'Wir sind mit zwei Kindern geflogen und mussten uns um nichts kümmern. Familienzimmer, Kindersitz im Transfer, sogar die Essenszeiten hatte unser Berater vorher geklärt.', highlight: true },
  { id: 'd2', name: 'Jonas', typ: 'pauschal', sterne: 5, datum: '2026-08-02', titel: 'Ein Ansprechpartner statt zehn Tabs', text: 'Ich hatte vorher stundenlang selbst verglichen. Hier gab es ein Gespräch, zwei Vorschläge und am nächsten Tag ein fertiges Paket mit Flug, Hotel und Mietwagen.', highlight: true },
  { id: 'd3', name: 'Elif', typ: 'staedtereise', sterne: 4, datum: '2026-06-21', titel: 'Drei Tage, gut genutzt', text: 'Das Hotel lag mitten in der Altstadt, der Reiseplan hatte für jeden Tag zwei, drei Ideen. Beim Rückflug gab es eine kurze Verspätung, die Info kam trotzdem rechtzeitig.', highlight: true },
  { id: 'd4', name: 'Henrik', typ: 'kreuzfahrt', sterne: 5, datum: '2026-05-30', titel: 'Erste Kreuzfahrt, keine Fragen offen', text: 'Kabine, Ausflüge, Anreise zum Hafen: alles stand in einem Dokument. Als sich eine Hafenzeit änderte, hat sich unser Berater von selbst gemeldet.', highlight: true },
  { id: 'd5', name: 'Sophie', typ: 'service', sterne: 4, datum: '2026-04-11', titel: 'Hilfe beim Visum', text: 'Ich wusste nicht, welche Unterlagen ich brauche. Die Liste war klar, der Antrag vorbereitet. Hat etwas länger gedauert als gedacht, lag aber an der Behörde.' },
  { id: 'd6', name: 'Ali', typ: 'pauschal', sterne: 5, datum: '2026-03-08', titel: 'Last Minute, trotzdem entspannt', text: 'Zehn Tage vor Abflug angefragt, am selben Tag zwei passende Angebote bekommen. Das Hotel war genau so ruhig wie gewünscht.' },
  { id: 'd7', name: 'Greta', typ: 'familie', sterne: 3, datum: '2026-02-17', titel: 'Gute Beratung, Hotel nur okay', text: 'Die Beratung war freundlich und schnell. Das Hotel war sauber, aber das Essen eher einfach. Für den Preis in Ordnung, beim nächsten Mal nehmen wir eine Kategorie höher.' },
  { id: 'd8', name: 'Paul', typ: 'service', sterne: 5, datum: '2026-01-25', titel: 'Kostenlose Erstberatung lohnt sich', text: 'Ich wollte nur wissen, ob unsere Idee mit zwei Kindern machbar ist. Nach einer halben Stunde hatten wir eine Route und ein Gefühl für das Budget.' },
  { id: 'd9', name: 'Lina', typ: 'kreuzfahrt', sterne: 4, datum: '2025-11-30', titel: 'Schöne Route', text: 'Die Route war toll, die Ausflüge gut ausgewählt. Die Kabine war kleiner als erwartet, das hätte ich vorher genauer nachfragen sollen.' }
];

window.RG_BEWERTUNG_TYPEN = {
  pauschal: 'Pauschal',
  familie: 'Familie',
  staedtereise: 'Städtereise',
  kreuzfahrt: 'Kreuzfahrt',
  service: 'Service'
};
