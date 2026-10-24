import { heroIconFor } from "./hero-icons";

const localRenders = new Set(["antimage", "axe", "crystal_maiden", "monkey_king"]);
const cdn = "https://cdn.steamstatic.com/apps/dota2";

/** Valve asset names differ from campaign IDs (e.g. Anti-Mage and Nature's Prophet). */
export function heroMedia(heroId: string, baseUrl = "/") {
  const icon = heroIconFor(heroId);
  if (!icon) return undefined;
  const slug = icon.valveName.replace(/^npc_dota_hero_/, "");
  const renderBase = localRenders.has(slug) ? `${baseUrl}dota-menu/${slug}` : `${cdn}/videos/dota_react/heroes/renders/${slug}`;
  return {
    poster: `${renderBase}.png`,
    video: `${renderBase}.webm`,
    portrait: `${cdn}/images/dota_react/heroes/${slug}.png`,
    icon: `${baseUrl}${icon.path}`,
  };
}
