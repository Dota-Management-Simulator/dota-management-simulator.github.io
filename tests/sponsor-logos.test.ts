import { test } from "node:test";
import assert from "node:assert/strict";
import { sponsors } from "../src/sponsors";
import data from "../src/data/sponsor-logos.json";

test("every catalog sponsor has a bundled logo or is explicitly listed as missing", () => {
  const ids = new Set(sponsors.map((s) => s.id));
  const covered = Object.keys(data.logos);
  for (const id of [...covered, ...data.missing]) assert.ok(ids.has(id), `${id} is not a catalog sponsor`);
  assert.equal(covered.length + data.missing.length, ids.size, "no sponsor is both covered and missing, or neither");
  assert.equal(new Set([...covered, ...data.missing]).size, ids.size);
});

test("bundled sponsor logos are valid single-path 24px icons with brand colors", () => {
  for (const [id, logo] of Object.entries(data.logos) as [string, { path: string; hex: string; title: string }][]) {
    assert.match(logo.hex, /^[0-9A-F]{6}$/i, `${id} color`);
    assert.match(logo.path, /^M[\d.\-\s,a-zA-Z]+$/, `${id} path`);
    assert.ok(logo.title, `${id} title`);
  }
  assert.match(data.generator, /^simple-icons@\d+\.\d+\.\d+$/);
});
