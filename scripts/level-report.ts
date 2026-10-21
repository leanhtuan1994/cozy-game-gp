/// <reference types="node" />
// Prints the difficulty curve of a set of level files as a Markdown table, re-solving each level.
// Levels of a known chapter also have their stored covers checked against the current sprites
// (assets/items/<chapter>/masks.json): a mismatch means the sprites changed after generation.
// Usage: bun scripts/level-report.ts <dir|file>... [--out report.md]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { computeCovers } from "../src/engine/puzzle/covers";
import { targetLossRate } from "../src/engine/puzzle/generator";
import { placeItems } from "../src/engine/puzzle/level";
import { initialState } from "../src/engine/puzzle/rules";
import { solve } from "../src/engine/puzzle/solver";
import { LevelDefSchema, type MaskSet } from "../src/engine/puzzle/types";

const { values, positionals } = parseArgs({ options: { out: { type: "string" } }, allowPositionals: true });
const files = positionals.flatMap((path) =>
  statSync(path).isDirectory()
    ? readdirSync(path)
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map((name) => join(path, name))
    : [path],
);
if (files.length === 0) {
  console.error("usage: bun scripts/level-report.ts <dir|file>... [--out report.md]");
  process.exit(1);
}

const rows = ["| Level | Items | Kinds | Layers | Covers | Target | Loss rate (aim) | Max tray | Near-full steps | Backtracks | Solver |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"];
let unsolved = 0;
let stale = 0;
for (const file of files) {
  const level = LevelDefSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const result = solve(initialState(level));
  if (result.status !== "solved") unsolved += 1;
  const masksPath = `assets/items/${level.chapter}/masks.json`;
  if (existsSync(masksPath)) {
    const masks = JSON.parse(readFileSync(masksPath, "utf8")) as MaskSet;
    if (JSON.stringify(computeCovers(placeItems(level.items, masks), masks)) !== JSON.stringify(level.covers)) {
      stale += 1;
      console.error(`${level.id}: stored covers do not match the current sprites; regenerate the levels`);
    }
  }
  const m = level.metrics;
  const target = level.target ?? 0;
  rows.push(
    `| ${level.id} | ${level.items.length} | ${new Set(level.items.map((i) => i.kind)).size} | ${new Set(level.items.map((i) => i.z)).size} | ${level.covers.length} | ${target.toFixed(2)} | ${m ? `${m.lossRate.toFixed(2)} (${targetLossRate(target).toFixed(2)})` : "–"} | ${m?.maxTray ?? "–"} | ${m?.nearFullSteps ?? "–"} | ${m?.backtracks ?? "–"} | ${result.status} (${result.nodes} nodes) |`,
  );
}
const report = `${rows.join("\n")}\n\n${files.length} levels, ${unsolved} not proven solvable, ${stale} with stale covers.\n`;
if (values.out) writeFileSync(values.out, report);
console.log(report);
process.exit(unsolved + stale > 0 ? 1 : 0);
