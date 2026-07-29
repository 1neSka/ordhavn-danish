import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { patchVinextStaticFileCache } from "./vinext-windows-static-cache.mjs";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptsDirectory, "..");
const productionServerUrl = pathToFileURL(path.join(
  projectDirectory,
  "node_modules",
  "vinext",
  "dist",
  "server",
  "prod-server.js",
)).href;

process.chdir(projectDirectory);
await patchVinextStaticFileCache();

const { startProdServer } = await import(productionServerUrl);
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

await startProdServer({
  port,
  host,
  outDir: path.join(projectDirectory, "dist"),
});
