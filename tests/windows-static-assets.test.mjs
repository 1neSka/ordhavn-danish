import assert from "node:assert/strict";
import test from "node:test";

import { addPortableStaticCacheKeys } from "../scripts/vinext-windows-static-cache.mjs";

test("Windows vinext cache keys are also addressable as URL paths", () => {
  const css = { path: "dist/client/assets/app.css" };
  const font = { path: "dist/client/assets/fonts/font.woff2" };
  const cache = {
    entries: new Map([
      ["/assets\\app.css", css],
      ["/assets\\fonts\\font.woff2", font],
      ["/favicon.svg", { path: "dist/client/favicon.svg" }],
    ]),
  };

  addPortableStaticCacheKeys(cache);

  assert.equal(cache.entries.get("/assets/app.css"), css);
  assert.equal(cache.entries.get("/assets/fonts/font.woff2"), font);
  assert.ok(cache.entries.has("/favicon.svg"));
});
