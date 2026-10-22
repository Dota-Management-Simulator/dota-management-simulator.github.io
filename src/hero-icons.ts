import catalog from "./data/hero-icons.json";

export interface HeroIconAsset {
  valveName: string;
  path: string;
  source: string;
}

export const heroIcons: Record<string, HeroIconAsset> = catalog.heroes;

export function heroIconFor(heroId?: string): HeroIconAsset | undefined {
  return heroId && Object.hasOwn(heroIcons, heroId) ? heroIcons[heroId] : undefined;
}
