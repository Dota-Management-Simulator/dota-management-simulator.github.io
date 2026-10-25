import { test } from "node:test";
import assert from "node:assert/strict";
import { tiMenuForCampaign, tiMenuStart } from "../src/menu-ti";
import { createCampaign, DEFAULT_SETTINGS } from "../src/game";
import { enableHistoricalCalendar, historicalCampaignStart } from "../src/historical-game";
import { createPatchPreviewCampaign, previewMoments, previewClientTransitions } from "../src/patch-preview";
import { menuEvents, eventMenuForCampaign } from "../src/menu-events";

const at = (year: number, now: string) => {
  const campaign = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year }));
  campaign.calendar!.now = `${now}T00:00:00Z`;
  return campaign;
};
const shift = (day: string, days: number) => new Date(Date.parse(day) + days * 86400000).toISOString().slice(0, 10);

test("the TI menu covers its client window and the event itself, in that year's client style", () => {
  const expected: [number, string, number][] = [[2012, "international-tab", 2], [2013, "compendium-2013", 3], [2014, "compendium-book", 4], [2015, "compendium-2015", 5],
    [2016, "battlepass", 6], [2017, "battlepass", 7], [2018, "battlepass", 8], [2019, "battlepass", 9], [2021, "compendium-2021", 10], [2022, "battlepass", 11],
    [2023, "compendium-sidebar", 12], [2024, "compendium-sidebar", 13], [2025, "compendium-sidebar", 14], [2026, "compendium-sidebar", 15]];
  for (const [year, style, edition] of expected) {
    const first = tiMenuStart(year);
    const menu = tiMenuForCampaign(at(year, first))!;
    assert.equal(menu.style, style);
    assert.equal(menu.edition, edition);
    // Captured layouts: TI2, TI4–TI6, TI10, TI12 and TI13. The rest borrow the nearest one.
    assert.equal(menu.inferred, ![2012, 2013, 2014, 2015, 2016, 2021, 2023, 2024].includes(year), `${year} inferred`);
    assert.equal(menu.from, first);
    assert.equal(tiMenuForCampaign(at(year, menu.to))?.year, year);
    assert.equal(tiMenuForCampaign(at(year, shift(first, -1))), undefined, `${year} before`);
    assert.equal(tiMenuForCampaign(at(year, shift(menu.to, 1))), undefined, `${year} after`);
    assert.equal(menu.teams.length, menu.event.teams.length);
    assert.ok(menu.event.pool > 0);
  }
  // TI1 predates the client screens, and 2020 had no International.
  assert.equal(tiMenuForCampaign(at(2011, "2011-08-18")), undefined);
  assert.equal(tiMenuForCampaign(at(2020, "2020-08-20")), undefined);
  assert.equal(tiMenuForCampaign({ calendar: undefined, world: undefined }), undefined);
});

test("TI2 keeps the ordinary client through July and switches at the first dated August capture", () => {
  assert.equal(tiMenuForCampaign(at(2012, historicalCampaignStart(2012).slice(0, 10))), undefined);
  assert.equal(tiMenuForCampaign(at(2012, "2012-08-19")), undefined);
  const campaign = at(2012, "2012-08-20");
  const before = JSON.stringify(campaign);
  assert.equal(tiMenuForCampaign(campaign)?.style, "international-tab");
  assert.equal(JSON.stringify(campaign), before);
  assert.equal(previewMoments.find(moment => moment.label === "The International 2012")?.date, "2012-08-20");
});

test("a new campaign starts inside its TI preparation month, and reading the menu never changes the save", () => {
  const campaign = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2014 }));
  const before = JSON.stringify(campaign);
  assert.equal(tiMenuForCampaign(campaign)?.style, "compendium-book");
  assert.equal(JSON.stringify(campaign), before);
});

test("preview moments open each dated client event and TI window on its exact day", () => {
  assert.equal(previewMoments.length, menuEvents.length + 14 + previewClientTransitions.length);
  assert.deepEqual(previewMoments.map(moment => moment.date), [...previewMoments.map(moment => moment.date)].sort());
  for (const moment of previewMoments) {
    const campaign = createPatchPreviewCampaign("2011.1", moment.date);
    assert.equal(campaign.calendar?.now.slice(0, 10), moment.date);
    assert.ok(eventMenuForCampaign(campaign) || tiMenuForCampaign(campaign) || previewClientTransitions.some(transition => transition.date === moment.date), moment.label);
    assert.equal(campaign.results.length, 0);
  }
  // Unknown dates fall back to the requested composite's start.
  assert.equal(createPatchPreviewCampaign("2014.1", "1999-01-01").calendar?.now.slice(0, 10), "2013-08-12");
});


test("Source 1 Compendiums start on their original release dates, independently of the preparation month", () => {
  for (const [year, date] of [[2013, "2013-05-08"], [2014, "2014-05-09"], [2015, "2015-05-01"]] as const) {
    assert.equal(tiMenuForCampaign(at(year, shift(date, -1))), undefined);
    const campaign = at(year, date);
    const before = JSON.stringify(campaign);
    assert.equal(tiMenuForCampaign(campaign)?.year, year);
    assert.equal(tiMenuStart(year), date);
    assert.equal(JSON.stringify(campaign), before);
    assert.equal(previewMoments.find(moment => moment.label === `The International ${year}`)?.date, date);
  }
});
