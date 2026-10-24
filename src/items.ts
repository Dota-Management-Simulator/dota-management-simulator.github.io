import type { Hero } from "./heroes";
import type { SeasonPatch } from "./patches";

export type ItemId = "bracer" | "wraith" | "null" | "boots" | "wand" | "blink" | "force" | "mek" | "bkb" | "desolator" | "heart" | "butterfly" | "rapier";
export type BuildStyle = "automatic" | "physical" | "spell" | "survival" | "utility";
export const buildStyles: BuildStyle[] = ["automatic", "physical", "spell", "survival", "utility"];
export interface MatchItem {
  id: ItemId; name: string; short: string; cost: number; attack: number; health: number;
  speed?: number; spells?: number; evasion?: number; description: string;
}
/** Deliberately bounded Lane Siege equivalents, not exact Dota item statistics.
 * Every item in this initial catalog existed in the opening era. */
export const itemCatalog: MatchItem[] = [
  { id: "bracer", name: "Bracer", short: "BR", cost: 450, attack: 1, health: 24, description: "Early durability." },
  { id: "wraith", name: "Wraith Band", short: "WB", cost: 450, attack: 3, health: 8, description: "Early attack damage." },
  { id: "null", name: "Null Talisman", short: "NT", cost: 450, attack: 1, health: 8, spells: .035, description: "Early spell damage." },
  { id: "boots", name: "Boots of Speed", short: "BS", cost: 500, attack: 0, health: 0, speed: .055, description: "Faster movement and rotations." },
  { id: "wand", name: "Magic Wand", short: "MW", cost: 450, attack: 1, health: 12, description: "A small emergency heal; 45-second recovery." },
  { id: "blink", name: "Blink Dagger", short: "BD", cost: 2250, attack: 1, health: 0, description: "Short travel blinks outside recent combat; 30-second recovery." },
  { id: "force", name: "Force Staff", short: "FS", cost: 2200, attack: 2, health: 28, description: "A short escape toward home when retreating; 45-second recovery." },
  { id: "mek", name: "Mekansm", short: "MK", cost: 2300, attack: 0, health: 32, description: "Heals nearby teammates in danger; 70-second recovery." },
  { id: "bkb", name: "Black King Bar", short: "BKB", cost: 4050, attack: 5, health: 46, description: "Brief protection against generic spells and stuns; 90-second recovery." },
  { id: "desolator", name: "Desolator", short: "DS", cost: 3500, attack: 13, health: 0, description: "Physical pressure against heroes and buildings." },
  { id: "heart", name: "Heart of Tarrasque", short: "HT", cost: 5000, attack: 2, health: 160, description: "Durability and improved regeneration outside combat." },
  { id: "butterfly", name: "Butterfly", short: "BF", cost: 5500, attack: 10, health: 24, evasion: .08, description: "Attack damage and reduced incoming physical damage." },
  { id: "rapier", name: "Divine Rapier", short: "DR", cost: 6000, attack: 45, health: 0, description: "High damage. Drops on death and can be recovered by either team." },
];
export const itemById = (id: string) => itemCatalog.find(item => item.id === id);
export function itemForPatch(id: ItemId, patch?: SeasonPatch): MatchItem {
  const base = itemById(id)!;
  // Composite patch axes drive modest, explicit gameplay estimates. These are
  // not a claim to reproduce archived shop recipes or every historical change.
  const economy = ((patch?.axes.economy ?? 50) - 50) / 50;
  const objectives = ((patch?.axes.objectives ?? 50) - 50) / 50;
  const teamfight = ((patch?.axes.teamfight ?? 50) - 50) / 50;
  return { ...base, cost: Math.round(base.cost * (1 - economy * .04) / 5) * 5,
    attack: base.attack * (1 + objectives * .06), health: base.health * (1 + teamfight * .06),
    ...(base.spells ? { spells: base.spells * (1 + teamfight * .08) } : {}) };
}
export function bkbProtection(patch?: SeasonPatch) {
  // The 7.33 composite has reduced protection rather than old-style immunity.
  return patch && patch.year >= 2023 ? .5 : .12;
}
export function automaticBuild(hero: Hero, role: number, style: BuildStyle = "automatic"): ItemId[] {
  const starter: ItemId = hero.attribute === "Agility" ? "wraith" : hero.attribute === "Intelligence" ? "null" : "bracer";
  const chosen = style === "automatic" ? role >= 3 ? "utility" : hero.attribute === "Intelligence" ? "spell" : role === 2 ? "survival" : "physical" : style;
  const main: ItemId[] = chosen === "utility" ? ["mek", "force", "bkb", "heart"]
    : chosen === "spell" ? ["blink", "bkb", "heart", "butterfly"]
    : chosen === "survival" ? ["bkb", "heart", "blink", "desolator"]
    : ["desolator", "bkb", "butterfly", "heart"];
  return [starter, "boots", "wand", ...main];
}
export interface ItemSnapshot {
  inventory?: ItemId[]; spendableGold?: number; netWorth?: number;
  nextItem?: ItemId; bkbUntil?: number; aegisUntil?: number;
}
export interface ItemEvent { time: number; playerId: string; item: ItemId; kind: "purchase" | "sale" | "drop" | "pickup"; gold: number }
