import { createCampaign, DEFAULT_SETTINGS } from "./game";
import { enableHistoricalCalendar } from "./historical-game";
import { historicalPatches, patchAtDate, patchForSeason } from "./patches";
import { menuEvents } from "./menu-events";
import { tiMenuStart } from "./menu-ti";
import { REBORN_CLIENT_DATE, SOURCE1_CLIENT_DATE } from "./menu-eras";

// Keep the preview finite, with a clearly fictional sample after the archive.
export const previewPatches = [...historicalPatches, patchForSeason(2027, 1), patchForSeason(2027, 2)];

export function previewPatch(id: string | null) {
  return previewPatches.find(patch => patch.id === id) ?? previewPatches[0];
}

/** Inspect both sides of the actual dashboard change without advancing a save. */
export const previewClientTransitions = [
  { label: "Last day of the original beta dashboard", date: "2012-05-23" },
  { label: "New Source 1 dashboard", date: SOURCE1_CLIENT_DATE },
  { label: "Store and Community tabs · January reference", date: "2013-01-24" },
  { label: "New Bloom · the Year Beast arrives", date: "2014-02-05" },
  { label: "Last day of the Source 1 client", date: "2015-09-08" },
  { label: "Reborn replaces Source 1", date: REBORN_CLIENT_DATE },
  { label: "Fall Season 2015 Compendium promotion", date: "2015-10-02" },
  { label: "Fall Compendium ends · default dashboard returns", date: "2015-11-24" },
  { label: "Balance of Power · 6.86", date: "2015-12-16" },
  { label: "Winter Battle Pass", date: "2016-01-27" },
  { label: "TI2016 Battle Pass opens", date: "2016-05-16" },
  { label: "Fall 2016 Battle Pass", date: "2016-10-05" },
  { label: "7.00 · The New Journey", date: "2016-12-12" },
  { label: "TI2017 Battle Pass opens", date: "2017-05-04" },
  { label: "TI2018 Battle Pass opens", date: "2018-05-08" },
  { label: "TI2019 Battle Pass opens", date: "2019-05-07" },
  { label: "TI10 Battle Pass · postponed tournament", date: "2020-05-25" },
  { label: "Aghanim’s Labyrinth Battle Pass", date: "2021-12-15" },
  { label: "2022 Battle Pass opens", date: "2022-09-01" },
];

/** Dated menu screens: transitions, client events and TI preparation months. */
export const previewMoments = [
  ...previewClientTransitions,
  ...menuEvents.map(event => ({ label: `${event.name} · ${event.window.from.slice(0, 4)}`, date: event.window.from })),
  ...[2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026].map(year => ({ label: `The International ${year}`, date: tiMenuStart(year) })),
].sort((a, b) => a.date.localeCompare(b.date));

export function previewMoment(date: string | null) {
  return previewMoments.find(moment => moment.date === date);
}

/** A fresh disposable world, never loaded from or written to campaign storage.
 * Set the composite's exact date without training, payroll or simulation. */
export function createPatchPreviewCampaign(id: string, date?: string) {
  const moment = previewMoment(date ?? null);
  const patch = moment ? patchAtDate(moment.date) : previewPatch(id);
  const campaign = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: patch.year }));
  const now = `${moment?.date ?? patch.startsOn}T00:00:00Z`;
  campaign.calendar = { ...campaign.calendar!, now, origin: now, paidWeeks: 0 };
  campaign.year = Number(now.slice(0, 4));
  campaign.week = Math.floor((Date.parse(now) - Date.UTC(campaign.year, 0, 1)) / 604800000) + 1;
  // Open straight into the page. Notes still contain the replayable trailers.
  campaign.patchIntroductions = { lastPatchId: patch.id, pending: [], dismissed: [patch.id] };
  return campaign;
}
