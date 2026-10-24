import type { Campaign } from "./game";
import type { SeasonPatch } from "./patches";
import { campaignPatch } from "./patches";
import { patchHeroArrivals } from "./patch-milestones";

export type MenuEraId = "classic" | "source1" | "reborn" | "journey" | "modern" | "frontiers" | "future";
export interface MenuEra {
  id: MenuEraId;
  layout: "beta" | "source1" | "reborn" | "showcase";
  title: string;
  subtitle: string;
  firstPatch: string;
  historicalRelease: string | null;
  source: string;
}

const eras: Record<MenuEraId, MenuEra> = {
  classic: { id: "classic", layout: "beta", title: "The original dashboard", subtitle: "The beta client", firstPatch: "2011.1", historicalRelease: null, source: "https://www.dota2.com/reborn/part1/" },
  source1: { id: "source1", layout: "source1", title: "The Dota 2 client", subtitle: "The Source 1 dashboard", firstPatch: "2012.2", historicalRelease: null, source: "https://www.reddit.com/r/DotA2/comments/yjhav/ti_dota_2_dashboard_changed/" },
  reborn: { id: "reborn", layout: "reborn", title: "Dota 2 Reborn", subtitle: "A new era of Dota", firstPatch: "2016.1", historicalRelease: "2015-09-09", source: "https://www.dota2.com/reborn/part1/" },
  journey: { id: "journey", layout: "reborn", title: "The New Journey", subtitle: "7.00 · A new chapter", firstPatch: "2017.1", historicalRelease: "2016-12-12", source: "https://www.dota2.com/700/eng" },
  modern: { id: "modern", layout: "reborn", title: "The evolving battlefield", subtitle: "The next generation", firstPatch: "2018.1", historicalRelease: null, source: "https://www.dota2.com/700/eng" },
  frontiers: { id: "frontiers", layout: "reborn", title: "New Frontiers", subtitle: "7.33 · A bigger battlefield", firstPatch: "2023.1", historicalRelease: "2023-04-20", source: "https://www.dota2.com/newfrontiers" },
  future: { id: "future", layout: "showcase", title: "Your next era", subtitle: "An alternate future", firstPatch: "2027.1", historicalRelease: null, source: "" },
};

/** Presentation follows the existing compressed patch clock, never the host date.
 * Real release dates remain metadata; these are representative menu eras, not
 * a claim that every historical dashboard has been reconstructed. */
export function menuEraForPatch(patch: Pick<SeasonPatch, "year" | "phase">): MenuEra {
  const id: MenuEraId = patch.year > 2026 ? "future" : patch.year >= 2023 ? "frontiers"
    : patch.year >= 2018 ? "modern" : patch.year >= 2017 ? "journey" : patch.year >= 2016 ? "reborn"
    : patch.year * 2 + patch.phase >= 2012 * 2 + 2 ? "source1" : "classic";
  return eras[id];
}

/** The Reborn client replaced Source 1 for everyone on this date; the 2016.1
 * composite starts a month earlier, straight after TI5. */
export const REBORN_CLIENT_DATE = "2015-09-09";

export function campaignMenu(campaign: Pick<Campaign, "year" | "week" | "calendar">) {
  const patch = campaignPatch(campaign);
  const day = campaign.calendar?.now.slice(0, 10);
  const byPatch = menuEraForPatch(patch);
  const era = byPatch.id === "reborn" && day && day < REBORN_CLIENT_DATE ? eras.source1 : byPatch;
  return { patch, era, arrivals: patchHeroArrivals(patch), monkeyKing: patch.year >= 2017 };
}
