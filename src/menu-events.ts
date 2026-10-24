import type { SeasonPatch } from "./patches";
import { campaignPatch } from "./patches";

export type MenuEventId = "diretide2012" | "greeviling" | "diretide2013" | "wraithnight" | "newbloom2015"
  | "darkmoon" | "siltbreaker" | "frostivus2019" | "labyrinth" | "diretide2020" | "nemestice" | "diretide" | "crownfall" | "curios2025";
/** How a Reborn event took over the client (docs/dota-menu-references.md):
 * a Play-menu event column, a full event home, or a Battle Pass page. */
export type RebornEventPattern = "column" | "home" | "battlepass";
export interface MenuEvent {
  id: MenuEventId;
  name: string;
  /** Source 1 events change the classic client; Reborn events change the Reborn client. */
  layout: "source1" | "reborn";
  pattern?: RebornEventPattern;
  firstPatch: string;
  /** Campaign dates (inclusive), copied from the real event. */
  window: { from: string; to: string };
  historicalRelease: string;
  source: string;
  subtitle: string;
  background?: string;
  logo?: string;
}

export const menuEvents: MenuEvent[] = [
  { id: "diretide2012", name: "Diretide", layout: "source1", firstPatch: "2013.1", window: { from: "2012-10-30", to: "2012-11-14" }, historicalRelease: "2012-10-30", source: "https://liquipedia.net/dota2/Events", subtitle: "Roshan wants his candy." },
  { id: "greeviling", name: "The Greeviling", layout: "source1", firstPatch: "2013.1", window: { from: "2012-12-19", to: "2013-01-08" }, historicalRelease: "2012-12-19", source: "https://www.dota2.com/greeviling", subtitle: "Frostivus has been cancelled.", logo: "greeviling-sign.jpg" },
  { id: "diretide2013", name: "Diretide", layout: "source1", firstPatch: "2014.1", window: { from: "2013-11-14", to: "2013-12-11" }, historicalRelease: "2013-11-14", source: "https://www.dota2.com/threespirits", subtitle: "Candy chaos." },
  { id: "wraithnight", name: "Wraith-Night", layout: "source1", firstPatch: "2014.1", window: { from: "2013-12-12", to: "2014-01-03" }, historicalRelease: "2013-12-12", source: "https://www.dota2.com/wraithnight", subtitle: "It’s Frostivus Eve. Your King needs you.", background: "wraith-night.jpg" },
  { id: "newbloom2015", name: "New Bloom Festival", layout: "source1", firstPatch: "2015.1", window: { from: "2015-02-12", to: "2015-03-02" }, historicalRelease: "2015-02-12", source: "https://www.dota2.com/newbloom", subtitle: "The Year Beast returns.", logo: "new-bloom-sign.jpg" },
  { id: "darkmoon", name: "Dark Moon", layout: "reborn", pattern: "column", firstPatch: "2017.1", window: { from: "2017-01-26", to: "2017-02-06" }, historicalRelease: "2017-01-26", source: "https://liquipedia.net/dota2/Events", subtitle: "Five new protectors stand against the Dark Moon Horde." },
  { id: "siltbreaker", name: "Siltbreaker", layout: "reborn", pattern: "column", firstPatch: "2017.2", window: { from: "2017-06-08", to: "2017-09-18" }, historicalRelease: "2017-06-08", source: "https://liquipedia.net/dota2/Events", subtitle: "Act I: The Sands of Fate.", background: "siltbreaker.jpg" },
  { id: "frostivus2019", name: "Frostivus", layout: "reborn", pattern: "home", firstPatch: "2020.1", window: { from: "2019-12-18", to: "2020-01-02" }, historicalRelease: "2019-12-18", source: "https://liquipedia.net/dota2/Events", subtitle: "The march of the Frostivus Penguins signals the Season of Givening." },
  { id: "labyrinth", name: "Aghanim’s Labyrinth", layout: "reborn", pattern: "column", firstPatch: "2020.2", window: { from: "2020-07-14", to: "2020-10-09" }, historicalRelease: "2020-07-14", source: "https://liquipedia.net/dota2/Events", subtitle: "Every great run begins with five.", background: "labyrinth-header.png" },
  { id: "diretide2020", name: "Diretide", layout: "reborn", pattern: "home", firstPatch: "2020.2", window: { from: "2020-10-29", to: "2020-12-22" }, historicalRelease: "2020-10-29", source: "https://www.dota2.com/diretide", subtitle: "The Diretide returns.", background: "diretide2020.jpg", logo: "diretide2020-logo.png" },
  { id: "nemestice", name: "Nemestice", layout: "reborn", pattern: "battlepass", firstPatch: "2021.1", window: { from: "2021-06-24", to: "2021-08-17" }, historicalRelease: "2021-06-24", source: "https://liquipedia.net/dota2/Events", subtitle: "Prepare for the impact.", background: "nemestice-landscape.jpg", logo: "nemestice-logo.png" },
  { id: "diretide", name: "Diretide", layout: "reborn", pattern: "home", firstPatch: "2023.1", window: { from: "2022-11-03", to: "2023-01-12" }, historicalRelease: "2022-11-03", source: "https://www.dota2.com/battlepass2022", subtitle: "Season’s Greetings.", background: "diretide-header.jpg", logo: "diretide-logo.png" },
  { id: "crownfall", name: "Crownfall", layout: "reborn", pattern: "home", firstPatch: "2024.1", window: { from: "2024-04-18", to: "2025-02-06" }, historicalRelease: "2024-04-18", source: "https://www.dota2.com/crownfall", subtitle: "Four chapters. Your road to the Aegis.", background: "crownfall-clouds.png", logo: "crownfall-logo.png" },
  { id: "curios2025", name: "Quartero’s Curios", layout: "reborn", pattern: "home", firstPatch: "2025.2", window: { from: "2025-08-05", to: "2025-11-05" }, historicalRelease: "2025-08-05", source: "https://liquipedia.net/dota2/Events", subtitle: "Play Dota and earn free rewards." },
];

const patchOrder = (id: string) => { const [year, phase] = id.split(".").map(Number); return year * 2 + phase; };

/** Weekly saves have no dates, so they keep the old whole-composite windows. */
export function eventMenuForPatch(patch: Pick<SeasonPatch, "year" | "phase">): MenuEvent | undefined {
  const id: MenuEventId | undefined = patch.year === 2020 && patch.phase === 2 ? "labyrinth"
    : patch.year === 2021 && patch.phase === 2 ? "nemestice"
    : patch.year === 2022 && patch.phase === 2 ? "diretide"
    : (patch.year === 2024 && patch.phase === 2) || (patch.year === 2025 && patch.phase === 1) ? "crownfall" : undefined;
  return menuEvents.find(event => event.id === id);
}

/** Dated events follow the campaign clock. */
export function eventMenuForDate(at: string | undefined): MenuEvent | undefined {
  const day = at?.slice(0, 10);
  return day ? menuEvents.find(event => event.window.from <= day && day <= event.window.to) : undefined;
}

export function eventMenuForCampaign(c: { year: number; week: number; calendar?: { now: string } }) {
  return c.calendar ? eventMenuForDate(c.calendar.now) : eventMenuForPatch(campaignPatch(c));
}

export function availableMenuEvents(patch: Pick<SeasonPatch, "year" | "phase">, at?: string) {
  const day = at?.slice(0, 10);
  return menuEvents.filter(event => day ? event.window.from <= day : patchOrder(event.firstPatch) < patch.year * 2 + patch.phase);
}
