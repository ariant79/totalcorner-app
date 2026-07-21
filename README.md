# Predicții Live — TotalCorner

App locală care afișează meciurile live și cele din următoarele 24h, cu predicții
(linie cornere, linie goluri, handicap, cornere live, atacuri periculoase),
preluate din `totalcorner.com/ro`.

## Cum funcționează

- **Scraper** (`scraper/`): folosește Playwright (Chromium headless) pentru a
  citi paginile publice `/ro/match/today` și `/ro/match/schedule/{yyyymmdd}`,
  care listează toate meciurile zilei — inclusiv status live, scor, cornere,
  handicap — fără niciun blocaj. Datele sunt salvate într-un fișier SQLite
  local (`data/totalcorner.db`).
- Paginile de **detaliu per meci** de pe TotalCorner (statistici complete,
  H2H, grafic live) sunt protejate de un checkbox Cloudflare ("Confirmă că nu
  ești un robot"), pe care nu îl automatizăm. În schimb, fiecare card din
  aplicație are un link către pagina reală TotalCorner (se deschide într-un
  tab nou, în browserul tău obișnuit).
- **API** (`app/api/matches`): citește din SQLite și servește JSON.
- **Frontend** (`app/page.tsx`): React + Tailwind, tabs Live/Următoarele 24h,
  filtru pe ligă, actualizare automată la 30s.

## Rulare locală

Instalare (o singură dată):

```bash
npm install
npx playwright install chromium
```

Rulează scraper-ul o dată (populează baza de date):

```bash
npm run scrape:once
```

Pornește aplicația web + scraper-ul în fundal (recomandat, refresh automat la 90s):

```bash
npm run dev:all
```

Apoi deschide [http://localhost:3000](http://localhost:3000).

Alternativ, separat în două terminale:

```bash
npm run dev            # doar aplicația web
npm run scrape:worker  # doar scraper-ul, în buclă
```

## Note

- Baza de date (`data/*.db`) e locală și ignorată de git.
- Scraper-ul e conservator cu frecvența cererilor (o singură pagină la ~90s)
  ca să nu suprasolicite site-ul.
