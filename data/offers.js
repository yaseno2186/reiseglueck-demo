/* ReiseGlück Reisebüro (Demo) – Katalog
   EINZIGE Datenquelle für Preisseite, Angebotskarten und Buchungsformular.
   Alle Preise sind fiktive Beispielpreise für ein Demo-Projekt.

   Preis-Modell je Eintrag:
     basis:  "pp"  = pro Person (Preis × Reisende)
             "fee" = pauschal (einmalige Gebühr pro Anfrage)
     art:    "fest"    = genauer Preis (von)
             "ab"      = ab-Preis (von)
             "spanne"  = Preisspanne (von – bis)
             "frei"    = kostenlos
             "angebot" = nach Angebot (kein Betrag)
*/
(function () {
  'use strict';

  var hinweis = 'Leistungen je nach Angebot, Verfügbarkeit vorbehalten.';
  var preisbasis = 'Beispielpreis (Demo), pro Person, 7 Nächte, Doppelzimmer';

  var angebote = [
    {
      id: 'mallorca', gruppe: 'angebot', name: 'Mallorca, 7 Nächte',
      kurz: 'Badebucht, Hotel mit Halbpension, Transfer inklusive.',
      basis: 'pp', art: 'fest', von: 899, einheit: 'p. P.', dauer: '7 Nächte',
      badge: 'Beliebt', inklusive: ['Flug', 'Hotel', 'Transfer', 'Halbpension'],
      zusatz: 'nach Verfügbarkeit',
      bild: 'bucht-mittelmeer', bildAlt: 'Sandbucht mit türkisem Wasser, Felsen und Pinien am Mittelmeer'
    },
    {
      id: 'tuerkei-familie', gruppe: 'angebot', name: 'Familienurlaub Türkei',
      kurz: 'Familienzimmer, Pool und kurze Wege zum Strand.',
      basis: 'pp', art: 'ab', von: 599, einheit: 'p. P.', dauer: '7 Nächte',
      badge: 'Für Familien', inklusive: ['Flug', 'Hotel', 'Transfer'],
      zusatz: 'je nach Hotel und Familiengröße',
      bild: 'kueste-tuerkei', bildAlt: 'Felsküste mit Pinienwald und ruhigem, klarem Wasser'
    }
  ];

  var pakete = [
    { id: 'budget', gruppe: 'paket', name: 'Budget 3★', kurz: 'Gute Lage, ehrlicher Preis, alles Wichtige dabei.', basis: 'pp', art: 'ab', von: 499, einheit: 'p. P.', dauer: '7 Nächte', bild: 'strand-palmen', bildAlt: 'Palmenstrand mit türkisem Meer von oben' },
    { id: 'komfort', gruppe: 'paket', name: 'Komfort 4★', kurz: 'Mehr Platz, bessere Ausstattung, ruhige Hotels.', basis: 'pp', art: 'spanne', von: 899, bis: 1400, einheit: 'p. P.', dauer: '7 Nächte', bild: 'pool-liegen', bildAlt: 'Holzliegen am Rand eines Pools mit klarem Wasser' },
    { id: 'premium', gruppe: 'paket', name: 'Premium 5★', kurz: 'Ausgewählte Häuser, besondere Lagen, persönlicher Service.', basis: 'pp', art: 'spanne', von: 1400, bis: 2200, einheit: 'p. P.', dauer: '7 Nächte', bild: 'paar-sonnenuntergang', bildAlt: 'Zwei Menschen sitzen bei Sonnenuntergang am Meer' },
    { id: 'lastminute', gruppe: 'paket', name: 'Last Minute', kurz: 'Kurzfristig los: Abreise innerhalb der nächsten 14 Tage.', basis: 'pp', art: 'ab', von: 399, einheit: 'p. P.', dauer: '7 Nächte', lastMinuteTage: 14, bild: 'flug-wolken', bildAlt: 'Flugzeugflügel über einer Wolkendecke im Abendlicht' },
    { id: 'familie', gruppe: 'paket', name: 'Familienurlaub', kurz: 'Familienzimmer, Kinderbetreuung und kindgerechte Ziele.', basis: 'pp', art: 'ab', von: 599, einheit: 'p. P.', dauer: '7 Nächte', bild: 'familie-strand', bildAlt: 'Familie läuft Hand in Hand am Strand ins Wasser, von hinten fotografiert' },
    { id: 'allinclusive', gruppe: 'paket', name: 'All-inclusive', kurz: 'Essen, Getränke und Snacks den ganzen Tag inklusive.', basis: 'pp', art: 'ab', von: 899, einheit: 'p. P.', dauer: '7 Nächte', bild: 'pool-liegen', bildAlt: 'Holzliegen am Rand eines Pools mit klarem Wasser' },
    { id: 'fernreise', gruppe: 'paket', name: 'Fernreise', kurz: 'Weit weg, gut geplant: mit Zwischenstopps nach Wunsch.', basis: 'pp', art: 'ab', von: 1800, einheit: 'p. P.', dauer: '10–14 Tage', bild: 'strand-palmen', bildAlt: 'Palmenstrand mit türkisem Meer von oben' },
    { id: 'deutschland', gruppe: 'paket', name: 'Deutschland', kurz: 'Nord- und Ostsee, Berge und Seen, ohne Flug.', basis: 'pp', art: 'ab', von: 299, einheit: 'p. P.', dauer: '7 Nächte', bild: 'strandkoerbe', bildAlt: 'Strandkörbe am Sandstrand der Ostsee' },
    { id: 'staedtereise', gruppe: 'paket', name: 'Städtereise', kurz: 'Drei Tage Altstadt, Museen und gutes Essen.', basis: 'pp', art: 'ab', von: 249, einheit: 'p. P.', dauer: '3 Tage', bild: 'altstadt-gasse', bildAlt: 'Schmale Altstadtgasse mit Wäscheleinen zwischen warmen Hausfassaden' },
    { id: 'kreuzfahrt', gruppe: 'paket', name: 'Kreuzfahrt', kurz: 'Jeden Morgen ein neuer Hafen, das Hotel reist mit.', basis: 'pp', art: 'ab', von: 699, einheit: 'p. P.', dauer: '7 Nächte', bild: 'kreuzfahrt-deck', bildAlt: 'Geschwungenes Schiffsdeck mit Reling und Blick auf das offene Meer' }
  ];

  var services = [
    { id: 'beratung', gruppe: 'service', name: 'Erste Beratung', kurz: 'Persönliches Kennenlernen, Ideen und erste Vorschläge.', basis: 'fee', art: 'frei', von: 0, einheit: 'pauschal' },
    { id: 'reiseplanung', gruppe: 'service', name: 'Individuelle Reiseplanung', kurz: 'Ihre Reise nach Ihren Wünschen zusammengestellt.', basis: 'fee', art: 'fest', von: 49, einheit: 'pauschal' },
    { id: 'reiseplan', gruppe: 'service', name: 'Detaillierter Reiseplan', kurz: 'Tag-für-Tag-Plan mit Zeiten, Adressen und Tipps.', basis: 'fee', art: 'fest', von: 79, einheit: 'pauschal' },
    { id: 'flug', gruppe: 'service', name: 'Flugbuchung', kurz: 'Passende Verbindung, Gepäck und Sitzplätze geklärt.', basis: 'fee', art: 'ab', von: 25, einheit: 'pauschal' },
    { id: 'hotel', gruppe: 'service', name: 'Hotelbuchung', kurz: 'Hotel nach Lage, Ausstattung und Budget.', basis: 'fee', art: 'ab', von: 20, einheit: 'pauschal' },
    { id: 'mietwagen', gruppe: 'service', name: 'Mietwagen', kurz: 'Fahrzeug mit klaren Versicherungsbedingungen.', basis: 'fee', art: 'ab', von: 15, einheit: 'pauschal' },
    { id: 'transfer', gruppe: 'service', name: 'Flughafentransfer', kurz: 'Abholung am Flughafen und Fahrt zum Hotel.', basis: 'fee', art: 'ab', von: 15, einheit: 'pauschal' },
    { id: 'versicherung', gruppe: 'service', name: 'Reiseversicherung', kurz: 'Reiserücktritt, Krankenschutz und Gepäck.', basis: 'fee', art: 'angebot', von: null, einheit: 'pauschal' },
    { id: 'visa', gruppe: 'service', name: 'Visa-Hilfe', kurz: 'Unterlagen prüfen und Antrag vorbereiten.', basis: 'fee', art: 'ab', von: 40, einheit: 'pauschal' }
  ];

  var alle = angebote.concat(pakete, services);

  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  function euro(n) { return eur.format(n); }

  function finde(id) {
    for (var i = 0; i < alle.length; i++) { if (alle[i].id === id) return alle[i]; }
    return null;
  }

  /* Preis als Text für Karten und Tabellen, z. B. "ab 499 €", "899–1.400 €", "kostenlos" */
  function preisText(it) {
    switch (it.art) {
      case 'frei': return 'kostenlos';
      case 'angebot': return 'nach Angebot';
      case 'ab': return 'ab ' + euro(it.von);
      case 'spanne': return euro(it.von).replace(/\s?€/, '') + '–' + euro(it.bis);
      default: return euro(it.von);
    }
  }

  /* Schätzung für die Buchungs-Zusammenfassung.
     reisende = Erwachsene + Kinder (nur relevant für "pp").
     Rückgabe: { text, detail, betragVon, betragBis, art } */
  function schaetzung(it, reisende) {
    var n = Math.max(1, reisende | 0);
    if (it.art === 'frei') return { art: 'frei', text: 'kostenlos', detail: 'Die erste Beratung kostet nichts.', betragVon: 0, betragBis: 0 };
    if (it.art === 'angebot') return { art: 'angebot', text: 'nach Angebot', detail: 'Den Preis nennt Ihnen Ihr Berater im persönlichen Angebot.', betragVon: null, betragBis: null };
    if (it.basis === 'fee') {
      var t = (it.art === 'ab' ? 'ab ' : '') + euro(it.von);
      return { art: it.art, text: t, detail: 'Einmalige Gebühr (pauschal), unabhängig von der Anzahl der Reisenden.', betragVon: it.von, betragBis: it.art === 'ab' ? null : it.von };
    }
    var faktor = n + ' × ';
    if (it.art === 'spanne') {
      return { art: 'spanne', text: euro(it.von * n).replace(/\s?€/, '') + '–' + euro(it.bis * n), detail: faktor + preisText(it) + ' p. P.', betragVon: it.von * n, betragBis: it.bis * n };
    }
    if (it.art === 'ab') {
      return { art: 'ab', text: 'ab ' + euro(it.von * n), detail: faktor + euro(it.von) + ' p. P. (ab-Preis)', betragVon: it.von * n, betragBis: null };
    }
    return { art: 'fest', text: euro(it.von * n), detail: faktor + euro(it.von) + ' p. P.', betragVon: it.von * n, betragBis: it.von * n };
  }

  window.RG_KATALOG = {
    hinweis: hinweis, preisbasis: preisbasis,
    angebote: angebote, pakete: pakete, services: services, alle: alle,
    finde: finde, preisText: preisText, schaetzung: schaetzung, euro: euro
  };
})();
