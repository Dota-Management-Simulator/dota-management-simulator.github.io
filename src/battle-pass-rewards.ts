import catalogue from "./data/battle-pass-rewards.json";

export interface BattlePassReward {
  id: string;
  passId: string;
  title: string;
  hero: string;
  kind: string;
  image: string;
  logo?: string | null;
  variants: string[];
  level: number | null;
  collection: string;
  video: string | null;
  description: string;
  source: string;
  spotlight: boolean;
  unlock: string;
}

export const battlePassRewards: readonly BattlePassReward[] = catalogue;

export function rewardsForPass(passId: string): BattlePassReward[] {
  return battlePassRewards.filter(reward => reward.passId === passId);
}

export function selectPassRewards(passId: string, view: "highlights" | "rewards" | "treasures", query = "", collection = "all", kind = "all"): BattlePassReward[] {
  const all = rewardsForPass(passId);
  const highlights = all.filter(reward => reward.spotlight);
  const text = query.trim().toLocaleLowerCase();
  return (view === "highlights" ? highlights.length ? highlights : all : all)
    .filter(reward => view !== "treasures" || reward.collection.includes("Treasure") || reward.kind === "Treasure")
    .filter(reward => collection === "all" || reward.collection === collection)
    .filter(reward => kind === "all" || reward.kind === kind)
    .filter(reward => !text || `${reward.title} ${reward.hero} ${reward.kind} ${reward.collection}`.toLocaleLowerCase().includes(text))
    .sort((a, b) => (a.level ?? Infinity) - (b.level ?? Infinity) || a.collection.localeCompare(b.collection) || a.title.localeCompare(b.title));
}
