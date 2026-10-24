// Renders assets/icon.svg to PNG files and a multi-size Windows .ico.
// sharp comes from the main project's node_modules.
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const desktopDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDirectory = path.join(desktopDirectory, "assets");
const require = createRequire(path.join(desktopDirectory, "..", "package.json"));
const sharp = require("sharp");

const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];

const svg = await fs.readFile(path.join(assetsDirectory, "icon.svg"));

async function renderPng(size) {
  return sharp(svg, { density: Math.max(72, (72 * size) / 256 * 4) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ICO with PNG-encoded entries (supported since Windows Vista).
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;
  images.forEach(({ size, data }, index) => {
    const entry = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entry);
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    directory.writeUInt8(0, entry + 2);
    directory.writeUInt8(0, entry + 3);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(data.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.data)]);
}

const images = [];
for (const size of ICO_SIZES) {
  images.push({ size, data: await renderPng(size) });
}

await fs.writeFile(path.join(assetsDirectory, "icon.ico"), buildIco(images));
await fs.writeFile(path.join(assetsDirectory, "icon.png"), await renderPng(512));
console.log(`Wrote icon.ico (${ICO_SIZES.join(", ")} px) and icon.png (512 px).`);
