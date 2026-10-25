import { rebornGamesLabel, source1TabLabels } from "../src/source1-navigation";
import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignMenu, menuEraForPatch, SOURCE1_CLIENT_DATE } from "../src/menu-eras";
import { historicalPatches, patchForSeason } from "../src/patches";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";

test("menu landmarks follow the existing composite boundaries and keep original release dates separate", () => {
  const before = menuEraForPatch(patchForSeason(2015, 2));
  const reborn = menuEraForPatch(patchForSeason(2016, 1));
  const journey = menuEraForPatch(patchForSeason(2017, 1));
  assert.equal(before.layout, "source1");
  assert.equal(menuEraForPatch(patchForSeason(2012, 1)).layout, "beta");
  assert.equal(menuEraForPatch(patchForSeason(2012, 2)).id, "source1");
  assert.equal(reborn.id, "reborn");
  assert.equal(reborn.historicalRelease, "2015-09-09");
  assert.notEqual(patchForSeason(2016, 1).startsOn, reborn.historicalRelease);
  assert.equal(journey.id, "journey");
  assert.equal(journey.historicalRelease, "2016-12-12");
  assert.equal(menuEraForPatch(patchForSeason(2018, 1)).layout, "reborn");
  assert.equal(menuEraForPatch(patchForSeason(2026, 2)).layout, "reborn");
  assert.equal(menuEraForPatch(patchForSeason(2027, 1)).layout, "showcase");
  assert.equal(menuEraForPatch(patchForSeason(2022, 2)).id, "modern");
  assert.equal(menuEraForPatch(patchForSeason(2023, 1)).id, "frontiers");
});

test("a dated save changes menu at its active patch even while its campaign year is still the preceding year", () => {
  const campaign = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2015 }));
  campaign.calendar!.now = "2015-08-08";
  assert.equal(campaignMenu(campaign).era.id, "source1");
  campaign.calendar!.now = "2015-08-09";
  assert.equal(campaign.year, 2015);
  assert.equal(campaignMenu(campaign).patch.id, "2016.1");
  // The 2016.1 composite starts after TI5; the Reborn client itself arrived on September 9.
  assert.equal(campaignMenu(campaign).era.id, "source1");
  campaign.calendar!.now = "2015-09-08";
  assert.equal(campaignMenu(campaign).era.id, "source1");
  campaign.calendar!.now = "2015-09-09";
  assert.equal(campaignMenu(campaign).era.id, "reborn");
});

test("the beta dashboard persists until Valve's May 24 redesign, including the May 1 composite change", () => {
  const campaign = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2012 }));
  for (const now of ["2011-08-22", "2012-04-30", "2012-05-01", "2012-05-23"]) {
    campaign.calendar!.now = `${now}T00:00:00Z`;
    assert.equal(campaignMenu(campaign).era.layout, "beta", now);
  }
  assert.equal(campaignMenu(campaign).patch.id, "2012.2");
  campaign.calendar!.now = `${SOURCE1_CLIENT_DATE}T00:00:00Z`;
  const saved = JSON.stringify(campaign);
  const menu = campaignMenu(campaign);
  assert.equal(menu.era.layout, "source1");
  assert.equal(menu.era.historicalRelease, "2012-05-24");
  assert.equal(menu.patch.id, "2012.2");
  assert.equal(JSON.stringify(campaign), saved, "presentation must not advance or migrate the campaign");
  assert.equal(campaignMenu({ year: 2012, week: 9 }).era.layout, "source1", "undated saves keep the composite mapping");
});

test("every historical phase has a presentation and no opening showcase exposes Monkey King before his composite arrival", () => {
  assert.equal(historicalPatches.length, 32);
  for (const patch of historicalPatches) {
    const campaign = { year: patch.year, week: patch.phase === 1 ? 1 : 9 };
    const menu = campaignMenu(campaign);
    assert.equal(menu.patch.id, patch.id);
    assert.ok(menu.era.title && menu.era.source);
    assert.equal(menu.monkeyKing, patch.year >= 2017);
    if (patch.year < 2017) assert.ok(menu.arrivals.every(hero => hero.id !== "monkey_king"));
    if (patch.phase === 2) assert.equal(menu.arrivals.length, 0);
  }
  assert.ok(campaignMenu({ year: 2017, week: 1 }).arrivals.some(hero => hero.id === "monkey_king"));
});

test("browsing and real save reload derive the same era without adding fields or changing the campaign", () => {
  const campaign = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2017 }));
  const before = JSON.stringify(campaign);
  const expected = campaignMenu(campaign).era.id;
  assert.equal(JSON.stringify(campaign), before);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? before : null } });
  try {
    const loaded = readSave();
    assert.ok(loaded);
    assert.equal(campaignMenu(loaded).era.id, expected);
    assert.equal(loaded.cash, campaign.cash);
    assert.equal(loaded.calendar?.now, campaign.calendar?.now);
    assert.deepEqual(loaded.roster, campaign.roster);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("uncatalogued future menus remain explicitly fictional and do not borrow a Valve update identity", () => {
  const menu = campaignMenu({ year: 2032, week: 9 });
  assert.equal(menu.era.id, "future");
  assert.equal(menu.era.historicalRelease, null);
  assert.equal(menu.era.source, "");
  assert.equal(menu.patch.generated, true);
  assert.match(menu.era.subtitle, /future/);
});


test("Source 1 navigation keeps captured labels in the same tab positions", () => {
  assert.deepEqual(source1TabLabels("2012-12-19"), { store: "Customize", library: "Learn", community: "Socialize" });
  assert.deepEqual(source1TabLabels("2013-01-24"), { store: "Store", library: "Learn", community: "Community" });
  assert.deepEqual(source1TabLabels("2013-11-14"), { store: "Store", library: "Library", community: "Community" });
  assert.equal(rebornGamesLabel("2015-09-09"), "Custom games");
  assert.equal(rebornGamesLabel("2015-12-16"), "Arcade");
});
