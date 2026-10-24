# Ordhavn som Windows-app

Et lille Electron-skal, der åbner Ordhavn i sit eget vindue. Appen starter selv
produktionsserveren (`scripts/start-production.mjs` på `127.0.0.1:3000`) fra
projektmappen og stopper den igen, når vinduet lukkes. Serveren lukker også
sig selv, hvis appen forsvinder uden at rydde op.

- Når kildekoden er nyere end den sidste build, kører appen `vinext build`
  (ca. 10 sekunder) før start. Fejler buildet, bruges den forrige build.
- En sund Ordhavn-server på port 3000 (fx `npm run dev` i en terminal)
  genbruges. En Ordhavn-server, der svarer med fejl, stoppes og erstattes.
  Andre programmer på porten røres ikke.

- `main.cjs` — server, vindue, menu og første import af fremgang
- `preload.cjs` — skriver den importerede fremgang ind før sidens egne scripts
- `splash.html` — startskærm og fejlvisning
- `assets/icon.svg` — kilden til ikonet (`npm run icon` laver `.ico` og `.png`)

## Byg og installér

```bash
npm install
npm run package
```

`npm run package` bygger `Ordhavn.exe`, installerer den i
`%LOCALAPPDATA%\Programs\Ordhavn` og lægger en genvej på skrivebordet. Appen
peger på denne projektmappe, så ændringer i kurset kræver ikke en ny pakke —
kun ændringer i `desktop/`.

## Fremgang

Appen har sin egen lagring i `%APPDATA%\Ordhavn`. Ved første start finder den
fremgangen fra browserversionen (`http://localhost:3000` i Chrome, Edge eller
Brave) og kopierer den ind, men kun hvis appen ikke selv har fremgang endnu.
Resultatet står i `%APPDATA%\Ordhavn\browser-import.json`. Serverloggen ligger i
`%LOCALAPPDATA%\Ordhavn\desktop-server.log`.
