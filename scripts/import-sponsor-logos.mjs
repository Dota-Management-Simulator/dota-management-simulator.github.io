// Regenerates src/data/sponsor-logos.json from the pinned simple-icons package (CC0 icon data).
// Run from the project root: node scripts/import-sponsor-logos.mjs
// Brands without an icon there stay listed as missing and render initials.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const icons = require("simple-icons");
const { version } = JSON.parse(readFileSync("node_modules/simple-icons/package.json", "utf8"));
const sponsors = JSON.parse(readFileSync("src/data/sponsors.json", "utf8"));

// Exact simple-icons slugs per sponsor ID; `parent` marks a parent-company mark.
const matches = {
  msi: "msi", steelseries: "steelseries", razer: "razer", alienware: "alienware", amd: "amd",
  hyperx: "hyperx", redbull: "redbull", corsair: "corsair", sap: "sap", dhl: "dhl",
  vodafone: "vodafone", honda: "honda", predator: { slug: "acer", parent: "Acer" },
  logitech: "logitechg", bmw: "bmw", samsung: "samsung", puma: "puma", coinbase: "coinbase",
  napster: "napster", visa: "visa",
};

const bySlug = new Map(Object.values(icons).map((icon) => [icon.slug, icon]));
const logos = {};
const missing = [];
for (const sponsor of sponsors) {
  const match = matches[sponsor.id];
  const spec = typeof match === "string" ? { slug: match } : match;
  const icon = spec && bySlug.get(spec.slug);
  if (!icon) { missing.push(sponsor.id); continue; }
  logos[sponsor.id] = {
    title: icon.title, slug: icon.slug, hex: icon.hex, path: icon.path,
    ...(spec.parent ? { parent: spec.parent } : {}),
    ...(icon.source ? { source: icon.source } : {}),
  };
}

writeFileSync("src/data/sponsor-logos.json", JSON.stringify({
  generator: `simple-icons@${version}`,
  license: "CC0-1.0 icon data; brand marks remain trademarks of their owners",
  logos, missing,
}, null, 2) + "\n");
console.log(`${Object.keys(logos).length} logos, ${missing.length} missing: ${missing.join(", ")}`);
