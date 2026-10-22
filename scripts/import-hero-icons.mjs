import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const opening = await readJson("src/data/heroes-2011.json");
const releases = await readJson("src/data/hero-releases.json");
const heroes = [...opening.heroes, ...releases.batches.flatMap((batch) => batch.heroes)];
const source = "https://www.dota2.com/datafeed/herolist?language=english";
const response = await fetch(source);
if (!response.ok) throw new Error(`Hero feed: HTTP ${response.status}`);
const feed = (await response.json()).result.data.heroes;
// Join exact English display names, then retain our stable IDs. Valve asset
// names differ from display names (e.g. Windranger uses windrunner).
const matched = heroes.map((hero) => {
  const valve = feed.find((entry) => entry.name_english_loc === hero.name);
  if (!valve) throw new Error(`No exact Valve identity for ${hero.id}: ${hero.name}`);
  const asset = valve.name.replace(/^npc_dota_hero_/, "");
  return {
    id: hero.id,
    valveName: valve.name,
    path: `hero-icons/${hero.id}.png`,
    source: `https://cdn.steamstatic.com/apps/dota2/images/dota_react/heroes/icons/${asset}.png`,
  };
});
await mkdir(path.join(root, "public/hero-icons"), { recursive: true });
const queue = [...matched];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let entry; (entry = queue.shift());) {
    const iconResponse = await fetch(entry.source);
    if (!iconResponse.ok) throw new Error(`${entry.id}: HTTP ${iconResponse.status}`);
    const bytes = Buffer.from(await iconResponse.arrayBuffer());
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      throw new Error(`${entry.id}: invalid PNG`);
    await writeFile(path.join(root, "public", entry.path), bytes);
  }
}));
const manifest = {
  source,
  retrievedUtc: new Date().toISOString().slice(0, 10),
  credit: "Dota 2 hero minimap artwork © Valve Corporation. Bundled official assets; no separate open license is claimed.",
  heroes: Object.fromEntries(matched.map(({ id, ...entry }) => [id, entry])),
};
await writeFile(path.join(root, "src/data/hero-icons.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Bundled ${matched.length} official hero icons.`);
