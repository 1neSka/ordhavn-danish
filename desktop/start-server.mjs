// Ordhavn desktop server. Ordhavn.exe (a WebView2 window, see build.ps1) starts this hidden and
// stops it when the window closes. It rebuilds the production version only when the sources are
// newer than the last build (about 10 seconds; on failure the previous build is served), then runs
// scripts/start-production.mjs on 127.0.0.1. Output goes to %LOCALAPPDATA%\Ordhavn\server.log.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildStampPath = path.join(projectDirectory, "dist", ".ordhavn-desktop-build.json");
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

const hasUsableBuild = () => fs.existsSync(path.join(projectDirectory, "dist", "server"))
  && fs.existsSync(path.join(projectDirectory, "dist", "client"));

function isBuildCurrent(sourceTime) {
  try {
    const stamp = JSON.parse(fs.readFileSync(buildStampPath, "utf8"));
    return hasUsableBuild() && stamp.sourceTime >= sourceTime;
  } catch {
    return false;
  }
}

const sourceTime = newestSourceChange();
if (!isBuildCurrent(sourceTime)) {
  console.log(`[desktop] ${new Date().toISOString()} building the production version`);
  const cli = path.join(projectDirectory, "node_modules", "vinext", "dist", "cli.js");
  const build = spawnSync(process.execPath, [cli, "build"], { cwd: projectDirectory, stdio: "inherit", windowsHide: true });
  if (build.status === 0) {
    fs.writeFileSync(buildStampPath, JSON.stringify({ sourceTime, builtAt: new Date().toISOString() }));
  } else if (hasUsableBuild()) {
    console.log("[desktop] build failed; serving the previous build");
  } else {
    console.error("[desktop] build failed and there is no previous build");
    process.exit(1);
  }
}

process.env.HOST ??= "127.0.0.1";   // never listen on the network
await import(pathToFileURL(path.join(projectDirectory, "scripts", "start-production.mjs")).href);
