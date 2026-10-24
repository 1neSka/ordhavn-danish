// Ordhavn desktop shell: starts the local Ordhavn server, shows the app in its
// own window and stops the server again when the window closes.
const { app, BrowserWindow, Menu, ipcMain, session, shell } = require("electron");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const PORT = 3000;
const ORIGIN = `http://localhost:${PORT}`;
const SERVER_TIMEOUT_MS = 60_000;
const PROGRESS_KEY = "ordhavn-progress-v1";
const MIN_NODE = [22, 13];

const iconPath = path.join(__dirname, "assets", "icon.ico");
const splashPath = path.join(__dirname, "splash.html");
const logDirectory = path.join(process.env.LOCALAPPDATA ?? os.tmpdir(), "Ordhavn");
const serverLogPath = path.join(logDirectory, "desktop-server.log");

let mainWindow = null;
let serverProcess = null;
let quitting = false;

// ---------------------------------------------------------------------------
// Configuration

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, "app-config.json"), "utf8"));
  } catch {
    return {};
  }
}

const config = readConfig();
const projectDirectory = process.env.ORDHAVN_PROJECT_DIR
  ?? config.projectDirectory
  ?? path.resolve(__dirname, "..");

function log(message) {
  try {
    fs.mkdirSync(logDirectory, { recursive: true });
    fs.appendFileSync(serverLogPath, `[${new Date().toISOString()}] [desktop] ${message}\n`);
  } catch {
    // Logging must never stop the app from opening.
  }
}

// ---------------------------------------------------------------------------
// Local server
//
// The app runs the production build: it answers in well under a second,
// while `vinext dev` recompiles on every start and its workerd runtime can
// get stuck answering 500 until it is restarted.

const LOOPBACK_HOSTS = ["127.0.0.1", "::1"];

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

async function listeningHosts(port) {
  const results = await Promise.all(LOOPBACK_HOSTS.map((host) => canConnect(host, port)));
  return LOOPBACK_HOSTS.filter((_host, index) => results[index]);
}

const urlFor = (host, pathname = "/") => `http://${host.includes(":") ? `[${host}]` : host}:${PORT}${pathname}`;

async function isHealthyOrdhavn(host) {
  try {
    const response = await fetch(urlFor(host), { signal: AbortSignal.timeout(4000) });
    return response.ok && (await response.text()).includes("Ordhavn");
  } catch {
    return false;
  }
}

function nodeVersionOf(executable, env) {
  try {
    const output = execFileSync(executable, ["-p", "process.versions.node"], {
      env, windowsHide: true, timeout: 15_000, encoding: "utf8",
    });
    return output.trim().split(".").map(Number);
  } catch {
    return null;
  }
}

function isSupported(version) {
  if (!version) return false;
  const [major, minor] = version;
  return major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1]);
}

function findNodeRuntime() {
  const candidates = [
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin", "node.exe"),
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "nodejs", "node.exe"),
  ];
  try {
    const found = execFileSync("where.exe", ["node"], { windowsHide: true, encoding: "utf8" });
    candidates.push(...found.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean));
  } catch {
    // No node on PATH.
  }

  for (const candidate of [...new Set(candidates)]) {
    if (fs.existsSync(candidate) && isSupported(nodeVersionOf(candidate, process.env))) {
      return { executable: candidate, env: {} };
    }
  }
  // Electron ships its own Node.js, which is new enough for the server.
  return { executable: process.execPath, env: { ELECTRON_RUN_AS_NODE: "1" } };
}

function readUserEnvironmentVariable(name) {
  try {
    const output = execFileSync("reg.exe", ["query", "HKCU\\Environment", "/v", name], {
      windowsHide: true, encoding: "utf8",
    });
    const match = output.match(new RegExp(`${name}\\s+REG_(?:EXPAND_)?SZ\\s+(.+)`, "u"));
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

let serverRuntime = null;

function runtimeEnvironment() {
  serverRuntime ??= findNodeRuntime();
  const env = { ...process.env, ...serverRuntime.env, BROWSER: "none" };
  env.GEMINI_API_KEY ??= readUserEnvironmentVariable("GEMINI_API_KEY") ?? undefined;
  if (!env.GEMINI_API_KEY) delete env.GEMINI_API_KEY;
  env.PATH = `${path.dirname(serverRuntime.executable)};${env.PATH ?? ""}`;
  return env;
}

function requireProject() {
  if (!fs.existsSync(path.join(projectDirectory, "node_modules", "vinext", "dist", "cli.js"))) {
    throw new Error(`Ordhavn-projektet blev ikke fundet i ${projectDirectory} (mangler node_modules).`);
  }
}

// --- Production build, rebuilt only when the project sources changed

const buildStampPath = () => path.join(projectDirectory, "dist", ".ordhavn-desktop-build.json");
const SOURCE_DIRECTORIES = ["app", "lib", "public", "worker", "build", "db"];
const SOURCE_FILES = [
  "package.json", "package-lock.json", "vite.config.ts", "next.config.ts",
  "tsconfig.json", "postcss.config.mjs", ".openai/hosting.json",
];

function newestSourceChange() {
  let newest = 0;
  const visit = (target) => {
    let stat;
    try { stat = fs.statSync(target); } catch { return; }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) visit(path.join(target, entry));
    } else {
      newest = Math.max(newest, stat.mtimeMs);
    }
  };
  for (const entry of [...SOURCE_DIRECTORIES, ...SOURCE_FILES]) visit(path.join(projectDirectory, entry));
  return newest;
}

function hasUsableBuild() {
  return fs.existsSync(path.join(projectDirectory, "dist", "server"))
    && fs.existsSync(path.join(projectDirectory, "dist", "client"));
}

function isBuildCurrent() {
  try {
    const stamp = JSON.parse(fs.readFileSync(buildStampPath(), "utf8"));
    return hasUsableBuild() && stamp.sourceTime >= newestSourceChange();
  } catch {
    return false;
  }
}

function runBuild() {
  const sourceTime = newestSourceChange();
  log("Building the production version");
  return new Promise((resolve) => {
    const logFile = fs.openSync(serverLogPath, "a");
    const cli = path.join(projectDirectory, "node_modules", "vinext", "dist", "cli.js");
    const build = spawn(serverRuntime.executable, [cli, "build"], {
      cwd: projectDirectory,
      env: runtimeEnvironment(),
      windowsHide: true,
      stdio: ["ignore", logFile, logFile],
    });
    build.once("error", (error) => { log(`Build could not start: ${error.message}`); resolve(false); });
    build.once("exit", (code) => {
      fs.closeSync(logFile);
      if (code === 0) {
        fs.writeFileSync(buildStampPath(), JSON.stringify({ sourceTime, builtAt: new Date().toISOString() }));
      }
      log(`Build finished with code ${code}`);
      resolve(code === 0);
    });
  });
}

async function ensureBuild() {
  runtimeEnvironment();
  if (isBuildCurrent()) return;
  setSplashStatus("Opdaterer Ordhavn …");
  if (await runBuild()) return;
  if (hasUsableBuild()) {
    log("Build failed; starting the previous build");
    return;
  }
  throw new Error("Ordhavn kunne ikke bygges. Se loggen for detaljer.");
}

// --- Port 3000

function listeningProcessIds(port) {
  try {
    const output = execFileSync("netstat.exe", ["-ano", "-p", "TCP"], { windowsHide: true, encoding: "utf8" })
      + execFileSync("netstat.exe", ["-ano", "-p", "TCPv6"], { windowsHide: true, encoding: "utf8" });
    const ids = new Set();
    for (const line of output.split(/\r?\n/u)) {
      const columns = line.trim().split(/\s+/u);
      if (columns.length >= 5 && columns[3] === "LISTENING" && columns[1].endsWith(`:${port}`)) ids.add(Number(columns[4]));
    }
    return [...ids].filter((id) => id > 0);
  } catch {
    return [];
  }
}

function commandLineOf(processId) {
  try {
    return execFileSync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-Command",
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${processId}").CommandLine`,
    ], { windowsHide: true, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

// Reuses a healthy Ordhavn server (for example `npm run dev` in a terminal),
// replaces a stuck one and never touches other programs on the port.
async function preparePort() {
  const hosts = await listeningHosts(PORT);
  if (hosts.length === 0) return "free";

  const healthy = await Promise.all(hosts.map(isHealthyOrdhavn));
  if (healthy.every(Boolean)) return "reuse";

  for (const processId of listeningProcessIds(PORT)) {
    const commandLine = commandLineOf(processId);
    const isOrdhavnServer = commandLine.includes("ORDHAVN_PARENT_PID")
      || (/vinext|start-production/u.test(commandLine)
        && commandLine.toLowerCase().includes(projectDirectory.toLowerCase()));
    if (!isOrdhavnServer) {
      throw new Error(`Port ${PORT} bruges af et andet program (PID ${processId}). Luk det og prøv igen.`);
    }
    log(`Stopping a stuck Ordhavn server (PID ${processId}): ${commandLine}`);
    try {
      execFileSync("taskkill.exe", ["/PID", String(processId), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    } catch {
      // Already gone.
    }
  }

  for (let attempt = 0; attempt < 20 && (await listeningHosts(PORT)).length > 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "free";
}

// The server exits by itself when the app disappears without cleaning up.
const SERVER_BOOTSTRAP = `
const parent = Number(process.env.ORDHAVN_PARENT_PID);
setInterval(() => { try { process.kill(parent, 0); } catch { process.exit(0); } }, 2000).unref();
await import(process.env.ORDHAVN_SERVER_ENTRY);
`;

function startServer() {
  const env = {
    ...runtimeEnvironment(),
    HOST: "127.0.0.1",
    PORT: String(PORT),
    ORDHAVN_PARENT_PID: String(process.pid),
    ORDHAVN_SERVER_ENTRY: pathToFileURL(path.join(projectDirectory, "scripts", "start-production.mjs")).href,
  };
  log(`Starting the production server with ${serverRuntime.executable}`);
  const logFile = fs.openSync(serverLogPath, "a");

  serverProcess = spawn(serverRuntime.executable, ["--input-type=module", "-e", SERVER_BOOTSTRAP], {
    cwd: projectDirectory,
    env,
    windowsHide: true,
    stdio: ["ignore", logFile, logFile],
  });
  serverProcess.once("exit", (code) => {
    log(`Server exited with code ${code}`);
    serverProcess = null;
    if (!quitting) showError("Den lokale Ordhavn-server stoppede uventet.");
  });
}

async function waitForServer() {
  const deadline = Date.now() + SERVER_TIMEOUT_MS;
  let failedAnswers = 0;
  while (Date.now() < deadline) {
    if (quitting) return false;
    try {
      const response = await fetch(urlFor("127.0.0.1"), { signal: AbortSignal.timeout(15_000) });
      if (response.ok) return true;
      log(`Server answered ${response.status}`);
      failedAnswers += 1;
      if (failedAnswers >= 5) return false;
    } catch {
      // Not listening yet.
    }
    if (serverProcess === null) return false;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function stopServer() {
  if (!serverProcess?.pid) return;
  try {
    execFileSync("taskkill.exe", ["/PID", String(serverProcess.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } catch {
    // Already gone.
  }
  serverProcess = null;
}

// ---------------------------------------------------------------------------
// One-time import of progress that was saved by the browser version

const importMarkerPath = () => path.join(app.getPath("userData"), "browser-import.json");
const importWorkDirectory = () => path.join(app.getPath("userData"), "browser-import-work");
let pendingImport = null;
let importScanned = false;

function browserProfiles() {
  const local = process.env.LOCALAPPDATA ?? "";
  const roots = [
    ["Chrome", path.join(local, "Google", "Chrome", "User Data")],
    ["Edge", path.join(local, "Microsoft", "Edge", "User Data")],
    ["Brave", path.join(local, "BraveSoftware", "Brave-Browser", "User Data")],
  ];
  const profiles = [];
  for (const [browser, root] of roots) {
    let entries = [];
    try { entries = fs.readdirSync(root); } catch { continue; }
    for (const name of entries) {
      if (name !== "Default" && !/^Profile \d+$/u.test(name)) continue;
      const leveldb = path.join(root, name, "Local Storage", "leveldb");
      if (fs.existsSync(leveldb)) profiles.push({ browser, profile: name, leveldb });
    }
  }
  return profiles;
}

function copyLevelDb(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(source)) {
    if (file === "LOCK") continue;
    try { fs.copyFileSync(path.join(source, file), path.join(target, file)); } catch { /* skip locked file */ }
  }
}

async function readOriginStorage(sessionPath) {
  const importSession = session.fromPath(sessionPath);
  // Serve a blank page for the origin so no app code runs against the copy.
  importSession.protocol.handle("http", () => new Response("<!doctype html><title>import</title>", {
    headers: { "content-type": "text/html" },
  }));
  const reader = new BrowserWindow({ show: false, webPreferences: { session: importSession, sandbox: true } });
  try {
    await reader.loadURL(`${ORIGIN}/`);
    const json = await reader.webContents.executeJavaScript(
      "JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])))",
    );
    return JSON.parse(json);
  } finally {
    reader.destroy();
  }
}

function progressRank(entries) {
  try {
    const progress = JSON.parse(entries[PROGRESS_KEY]);
    return [String(progress.lastActiveDate ?? ""), Number(progress.xp ?? 0)];
  } catch {
    return ["", 0];
  }
}

function removeImportCopies() {
  try {
    fs.rmSync(importWorkDirectory(), { recursive: true, force: true, maxRetries: 2 });
  } catch {
    // Still locked by this run; the next start removes it.
  }
}

async function prepareBrowserImport() {
  removeImportCopies();
  if (fs.existsSync(importMarkerPath())) return;

  const found = [];
  for (const [index, profile] of browserProfiles().entries()) {
    const sessionPath = path.join(importWorkDirectory(), String(index));
    try {
      copyLevelDb(profile.leveldb, path.join(sessionPath, "Local Storage", "leveldb"));
      const entries = await readOriginStorage(sessionPath);
      if (entries[PROGRESS_KEY]) found.push({ ...profile, entries });
    } catch (error) {
      log(`Could not read ${profile.browser}/${profile.profile}: ${error.message}`);
    }
  }

  found.sort((a, b) => {
    const [dateA, xpA] = progressRank(a.entries);
    const [dateB, xpB] = progressRank(b.entries);
    return dateB.localeCompare(dateA) || xpB - xpA;
  });
  pendingImport = found[0] ?? null;
  importScanned = true;
  log(pendingImport
    ? `Browser progress found in ${pendingImport.browser}/${pendingImport.profile} (${Object.keys(pendingImport.entries).length} keys)`
    : "No browser progress found to import");
}

function finishBrowserImport(applied) {
  const marker = {
    finishedAt: new Date().toISOString(),
    applied,
    source: pendingImport ? `${pendingImport.browser}/${pendingImport.profile}` : null,
  };
  fs.writeFileSync(importMarkerPath(), JSON.stringify(marker, null, 2));
  log(`Browser import finished: ${JSON.stringify(marker)}`);
  pendingImport = null;
}

ipcMain.on("ordhavn:import-payload", (event) => {
  event.returnValue = pendingImport?.entries ?? null;
});
ipcMain.on("ordhavn:import-finished", (event, applied) => {
  // A failed scan is retried on the next start instead of being marked done.
  if ((importScanned || applied) && !fs.existsSync(importMarkerPath())) finishBrowserImport(Boolean(applied));
  event.returnValue = true;
});
ipcMain.on("ordhavn:restart", () => {
  app.relaunch();
  app.quit();
});

// ---------------------------------------------------------------------------
// Window

const windowStatePath = () => path.join(app.getPath("userData"), "window-state.json");

function readWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath(), "utf8"));
  } catch {
    return { width: 1360, height: 880, maximized: false };
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getNormalBounds();
  fs.writeFileSync(windowStatePath(), JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }));
}

function isAppUrl(url) {
  return url.startsWith(`${ORIGIN}/`) || url === ORIGIN;
}

function createWindow() {
  const state = readWindowState();
  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 860,
    minHeight: 600,
    title: "Ordhavn",
    icon: iconPath,
    backgroundColor: "#191821",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  if (state.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", saveWindowState);
  mainWindow.on("closed", () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/u.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || url.startsWith("file:")) return;
    event.preventDefault();
    if (/^https?:/u.test(url)) shell.openExternal(url);
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && isAppUrl(url) && code !== -3) {
      showError(`Siden kunne ikke indlæses (${description}).`);
    }
  });

  mainWindow.webContents.on("did-finish-load", applySplashStatus);
  mainWindow.loadFile(splashPath, { query: { state: "loading" } });
}

function showError(message) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadFile(splashPath, { query: { state: "error", message, log: serverLogPath } });
}

let splashStatus = null;

function applySplashStatus() {
  if (!splashStatus || !mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.webContents.getURL().startsWith("file:")) return;
  mainWindow.webContents.executeJavaScript(`window.setStatus?.(${JSON.stringify(splashStatus)})`).catch(() => {});
}

function setSplashStatus(text) {
  splashStatus = text;
  applySplashStatus();
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Ordhavn",
      submenu: [
        { label: "Genindlæs", accelerator: "F5", click: () => mainWindow?.webContents.reload() },
        { label: "Åbn serverlog", click: () => shell.openPath(serverLogPath) },
        { type: "separator" },
        { label: "Afslut", role: "quit" },
      ],
    },
    {
      label: "Vis",
      submenu: [
        { label: "Zoom ind", role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { label: "Zoom ud", role: "zoomOut" },
        { label: "Normal størrelse", role: "resetZoom" },
        { type: "separator" },
        { label: "Fuld skærm", role: "togglefullscreen" },
        { label: "Udviklerværktøjer", role: "toggleDevTools", accelerator: "CmdOrCtrl+Shift+I" },
      ],
    },
  ]);
}

// ---------------------------------------------------------------------------
// Lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(buildMenu());
    createWindow();

    try {
      fs.mkdirSync(logDirectory, { recursive: true });
      fs.writeFileSync(serverLogPath, "");
      requireProject();
      const importing = prepareBrowserImport().catch((error) => log(`Browser import failed: ${error.message}`));

      const portState = await preparePort();
      if (portState === "reuse") {
        log(`Reusing the healthy Ordhavn server already listening on port ${PORT}`);
      } else {
        await ensureBuild();
        if (quitting) return;
        startServer();
      }
      const [ready] = await Promise.all([
        portState === "reuse" ? true : waitForServer(),
        importing,
      ]);
      if (quitting) return;
      if (!ready) {
        showError("Den lokale Ordhavn-server startede ikke i tide.");
        return;
      }
      mainWindow?.loadURL(`${ORIGIN}/`);
    } catch (error) {
      log(`Startup failed: ${error.stack ?? error.message}`);
      showError(error.message);
    }
  });

  app.on("before-quit", () => {
    quitting = true;
    saveWindowState();
    session.defaultSession.flushStorageData();
  });
  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", () => {
    stopServer();
    removeImportCopies();
  });
}
