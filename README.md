# ReiseGlück Reisebüro – Demo-Website

**Fiktives Demo-Projekt.** ReiseGlück Reisebüro ist eine erfundene Marke. Diese Website ist ein Probeprojekt der Agentur Armsin. Es gibt kein echtes Unternehmen, alle Preise sind Beispielpreise, alle Bewertungen sind als Demo-Beispiele markiert, und Formulare senden keine Daten.

## Technik

- Statisches HTML, ein Stylesheet (`assets/css/style.css`), Vanilla-JS ohne Build-Schritt
- Katalog als einzige Datenquelle: `data/offers.js` (Preisseite, Angebotskarten, Buchungsformular)
- Beispielbewertungen: `data/reviews.js` (später durch echte, geprüfte Bewertungen ersetzbar)
- `assets/js/booking.js`: geführte Buchungsanfrage, Fortschritt im sessionStorage
- `assets/js/reviews.js`: Bewertungen mit Filter, Sortierung, Durchschnitt; eigene Bewertungen nur im localStorage, Ausgabe per `textContent`
- Schriften und Bilder selbst gehostet, keine CDNs, keine Tracker, keine Cookies
- `noindex` auf allen Seiten und `robots.txt` mit `Disallow: /`

## Lokal ansehen

```bash
python -m http.server 8090
```

Dann `http://localhost:8090` öffnen.

## Bildnachweise

Fotos von Unsplash (Unsplash-Lizenz), Details in `credits.txt` und auf `bildnachweise.html`. Logo, Icons und Illustrationen sind eigene Vektorgrafiken.
