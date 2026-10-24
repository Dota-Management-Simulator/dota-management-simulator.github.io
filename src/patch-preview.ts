import { createCampaign, DEFAULT_SETTINGS } from "./game";
import { enableHistoricalCalendar } from "./historical-game";
import { historicalPatches, patchAtDate, patchForSeason } from "./patches";
import { menuEvents } from "./menu-events";
import { historicalCampaignStart as tiPreparation } from "./historical-game";

// Keep the preview finite, with a clearly fictional sample after the archive.
export const previewPatches = [...historicalPatches, patchForSeason(2027, 1), patchForSeason(2027, 2)];

export function previewPatch(id: string | null) {
  return previewPatches.find(patch => patch.id === id) ?? previewPatches[0];
}

/** Dated menu screens: each client event's first day and each TI's preparation month. */
export const previewMoments = [
  ...menuEvents.map(event => ({ label: `${event.name} · ${event.window.from.slice(0, 4)}`, date: event.window.from })),
  ...[2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026].map(year => ({ label: `The International ${year}`, date: tiPreparation(year).slice(0, 10) })),
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
