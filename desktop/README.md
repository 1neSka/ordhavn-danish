# Ordhavn som Windows-app

Et lille WebView2-vindue (WebHost fra skill'en `windows-desktop-app`, ca. 1 MB) i stedet for Electron.
Vinduet bruger den Chromium, der allerede er i Windows, og starter selv produktionsserveren fra denne
projektmappe; serveren stopper, når vinduet lukkes (også hvis appen går ned).

- `start-server.mjs` bygger produktionsversionen igen, når kildekoden er nyere end sidste build
  (ca. 10 sekunder; fejler buildet, bruges den forrige), og starter `scripts/start-production.mjs`
  på `127.0.0.1:3000`. En Ordhavn-server, der allerede kører på port 3000, genbruges.
- `app.template.json` er appens indstillinger; `build.ps1` laver `app.json`, `Ordhavn.exe` og genvejen.
- `assets/icon.svg` er kilden til ikonet.
- `_electron-old/` er den gamle Electron-version (kun til reference).

## Byg og installér

```powershell
powershell -ExecutionPolicy Bypass -File desktop\build.ps1 -Shortcut
```

Installerer i `%USERPROFILE%\Programs\OrdhavnLite` og lægger genvejen "Ordhavn" på skrivebordet.
Ændringer i kurset kræver ikke en ny build af appen, kun ændringer i `desktop/`. Kræver Node 22.13+
(systemets Node eller Codex' indbyggede Node).

## Fremgang og logs

Fremgangen ligger i appens WebView2-profil `%LOCALAPPDATA%\Ordhavn\WebView2` (origin
`http://localhost:3000`). Den blev flyttet fra Electron-versionen den 2026-10-24; en kopi står i
`%LOCALAPPDATA%\Ordhavn\electron-progress-backup.json`. Serverloggen: `%LOCALAPPDATA%\Ordhavn\server.log`.
Fejlsøgning: `Ordhavn.exe --dev` (F12) eller `--debug-port=9555`.
