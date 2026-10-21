/// <reference types="node" />
// Builds low-resolution alpha masks for every sprite in a folder and writes masks.json next
// to them. The game hit-tests and computes covering from these masks, never from the images.
// Usage: bun scripts/make-hit-masks.ts assets/sprites/spike
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { buildMask } from "./lib/build-mask";
import { decodePng } from "./lib/png";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: bun scripts/make-hit-masks.ts <sprite-folder>");
  process.exit(1);
}

const masks: Record<string, ReturnType<typeof buildMask>> = {};
for (const file of readdirSync(dir).filter((name: string) => name.endsWith(".png")).sort()) {
  masks[basename(file, ".png")] = buildMask(decodePng(readFileSync(join(dir, file))));
}

const out = join(dir, "masks.json");
writeFileSync(out, `${JSON.stringify(masks)}\n`);
console.log(`wrote ${Object.keys(masks).length} masks to ${out}`);
