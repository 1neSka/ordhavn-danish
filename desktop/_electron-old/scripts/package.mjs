// Builds Ordhavn.exe, installs it to %LOCALAPPDATA%\Programs\Ordhavn and
// places a shortcut on the desktop. The app keeps running the server from
// this project folder, so course changes show up without repackaging.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";

const desktopDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectDirectory = path.resolve(desktopDirectory, "..");
const installDirectory = path.join(process.env.LOCALAPPDATA, "Programs", "Ordhavn");
const stagingDirectory = path.join(os.tmpdir(), "ordhavn-package");
const iconPath = path.join(desktopDirectory, "assets", "icon.ico");

await fs.writeFile(
  path.join(desktopDirectory, "app-config.json"),
  `${JSON.stringify({ projectDirectory }, null, 2)}\n`,
);

await fs.rm(stagingDirectory, { recursive: true, force: true });
const [builtDirectory] = await packager({
  dir: desktopDirectory,
  out: stagingDirectory,
  name: "Ordhavn",
  executableName: "Ordhavn",
  platform: "win32",
  arch: "x64",
  icon: iconPath,
  asar: true,
  overwrite: true,
  ignore: [/^\/scripts($|\/)/u, /^\/out($|\/)/u, /^\/assets\/icon\.svg$/u],
  appCopyright: "Ordhavn",
  win32metadata: {
    CompanyName: "Ordhavn",
    FileDescription: "Ordhavn",
    ProductName: "Ordhavn",
    InternalName: "Ordhavn",
    OriginalFilename: "Ordhavn.exe",
  },
});

try {
  await fs.rm(installDirectory, { recursive: true, force: true });
} catch (error) {
  throw new Error(`Luk Ordhavn, før appen opdateres (${error.code}).`);
}
await fs.mkdir(path.dirname(installDirectory), { recursive: true });
await fs.cp(builtDirectory, installDirectory, { recursive: true });
await fs.rm(stagingDirectory, { recursive: true, force: true });

const executable = path.join(installDirectory, "Ordhavn.exe");
// WScript.Shell saves through the ANSI code page, which cannot spell a
// localized desktop path such as "Рабочий стол", so the link is moved there.
const shortcutScript = `
$desktop = [Environment]::GetFolderPath("Desktop")
$temporary = Join-Path ([IO.Path]::GetTempPath()) "Ordhavn.lnk"
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($temporary)
$link.TargetPath = $env:ORDHAVN_EXE
$link.WorkingDirectory = Split-Path -Parent $env:ORDHAVN_EXE
$link.IconLocation = "$env:ORDHAVN_EXE,0"
$link.Description = "Ordhavn - dansk laeringsspil"
$link.Save()
$target = Join-Path $desktop "Ordhavn.lnk"
Move-Item -LiteralPath $temporary -Destination $target -Force
Write-Output $target
`;
const shortcut = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", shortcutScript], {
  env: { ...process.env, ORDHAVN_EXE: executable },
  encoding: "utf8",
}).trim();

console.log(`Installed ${executable}`);
console.log(`Shortcut ${shortcut}`);
