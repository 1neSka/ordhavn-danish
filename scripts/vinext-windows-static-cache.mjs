import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptsDirectory, "..");
const cacheModuleUrl = pathToFileURL(path.join(
  projectDirectory,
  "node_modules",
  "vinext",
  "dist",
  "server",
  "static-file-cache.js",
)).href;

export function addPortableStaticCacheKeys(cache) {
  if (!(cache?.entries instanceof Map)) return cache;
  for (const [key, entry] of [...cache.entries]) {
    const portableKey = key.replaceAll("\\", "/");
    if (portableKey !== key && !cache.entries.has(portableKey)) {
      cache.entries.set(portableKey, entry);
    }
  }
  return cache;
}

export async function patchVinextStaticFileCache() {
  if (process.platform !== "win32") return;
  const { StaticFileCache } = await import(cacheModuleUrl);
  if (StaticFileCache.__ordhavnWindowsPatch) return;

  const createCache = StaticFileCache.create;
  StaticFileCache.create = async function createPortableCache(...args) {
    return addPortableStaticCacheKeys(await createCache.apply(this, args));
  };
  StaticFileCache.__ordhavnWindowsPatch = true;
}
