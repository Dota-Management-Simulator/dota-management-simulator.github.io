import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { availableMenuEvents, eventMenuForCampaign, eventMenuForDate, eventMenuForPatch, menuEvents } from "../src/menu-events";
import { historicalPatches, patchAtDate, patchForSeason } from "../src/patches";

test("Reborn event themes appear in their explicit composite windows and leave the future unassigned", () => {
  const windows: Record<string, string> = { "2020.2": "labyrinth", "2021.2": "nemestice", "2022.2": "diretide", "2024.2": "crownfall", "2025.1": "crownfall" };
  for (const patch of historicalPatches) assert.equal(eventMenuForPatch(patch)?.id, windows[patch.id], patch.id);
  assert.equal(eventMenuForPatch(patchForSeason(2027, 1)), undefined);
  assert.equal(eventMenuForPatch(patchForSeason(2032, 2)), undefined);
});

test("client events follow the campaign date, inclusive at both ends, and never overlap", () => {
  const dated = menuEvents;
  assert.deepEqual(dated.map(event => event.id), ["diretide2012", "greeviling", "diretide2013", "wraithnight", "newbloom2014", "newbloom2015",
    "darkmoon", "siltbreaker", "underhollow", "frosthaven", "newbloom2019", "frostivus2019", "labyrinth", "diretide2020", "nemestice", "diretide", "anniversary10", "frostivus2023", "crownfall", "curios2025", "darkcarnival"]);
  for (const event of dated) {
    const { from, to } = event.window;
    assert.ok(from <= to, event.id);
    assert.equal(event.layout, from < "2015-09-09" ? "source1" : "reborn", event.id);
    assert.equal(!!event.pattern, event.layout === "reborn", event.id);
    assert.equal(eventMenuForDate(`${from}T00:00:00Z`)?.id, event.id);
    assert.equal(eventMenuForDate(`${to}T23:00:00Z`)?.id, event.id);
    assert.equal(patchAtDate(from).id, event.firstPatch, event.id);
    for (const other of dated) if (other !== event) assert.ok(other.window.to < from || other.window.from > to, `${event.id} overlaps ${other.id}`);
  }
  assert.equal(eventMenuForDate("2013-12-11")?.id, "diretide2013");
  assert.equal(eventMenuForDate("2013-12-12")?.id, "wraithnight");
  assert.equal(eventMenuForDate("2014-01-04"), undefined);
  assert.equal(eventMenuForDate(undefined), undefined);
  assert.equal(eventMenuForCampaign({ year: 2015, week: 7, calendar: { now: "2015-02-20T00:00:00Z" } })?.id, "newbloom2015");
  assert.equal(eventMenuForCampaign({ year: 2021, week: 30, calendar: { now: "2021-07-01T00:00:00Z" } })?.id, "nemestice");
  // A dated save outside every window shows no event, even inside an old composite window.
  assert.equal(eventMenuForCampaign({ year: 2021, week: 40, calendar: { now: `${patchForSeason(2021, 2).startsOn}T00:00:00Z` } }), undefined);
  assert.equal(eventMenuForDate("2025-02-06")?.id, "crownfall");
  assert.equal(eventMenuForDate("2025-02-07"), undefined);
  // Weekly saves without a calendar never invent a date for client events.
  assert.equal(eventMenuForCampaign({ year: 2013, week: 1 }), undefined);
});

test("event archive is gated by date or composite, retains previous events and never mutates the patch", () => {
  for (const patch of historicalPatches) {
    const before = JSON.stringify(patch);
    const available = availableMenuEvents(patch, patch.startsOn);
    for (const event of menuEvents) {
      const expected = event.window.from <= patch.startsOn;
      assert.equal(available.includes(event), expected, `${patch.id}: ${event.id}`);
    }
    assert.equal(JSON.stringify(patch), before);
  }
  assert.ok(availableMenuEvents(patchForSeason(2014, 1), "2013-12-20").some(event => event.id === "wraithnight"));
  assert.ok(!availableMenuEvents(patchForSeason(2014, 1), "2013-12-01").some(event => event.id === "wraithnight"));
  assert.equal(availableMenuEvents(patchForSeason(2027, 1)).length, menuEvents.length);
});

test("event artwork ships locally and historical release metadata stays distinct from composite dates", () => {
  for (const event of menuEvents) {
    assert.equal(event.window.from, event.historicalRelease);
    assert.match(event.source, /^https:\/\/(www\.dota2\.com|liquipedia\.net)\//);
    for (const file of [event.background, event.logo].filter(Boolean)) assert.ok(existsSync(new URL(`../public/dota-menu/${file}`, import.meta.url)), file);
  }
  for (const file of ["ti-battlepass-logo.png", "ti-logo.png", "ti2016.jpg", "ti2017.jpg", "ti2018.jpg", "ti2019.jpg", "ti2021.jpg", "ti2023.jpg", "update-reborn.jpg", "update-wanderingwaters.jpg", "dota-symbol.png", "crownfall-heroes.png", "crownfall-acts.png", "wraith-night.jpg", "greeviling-sign.jpg", "new-bloom-sign.jpg", "ti2012-panel.jpg", "ti2012-seattle.jpg", "ti2015.jpg", "ti2015-compendium-logo.png"])
    assert.ok(existsSync(new URL(`../public/dota-menu/${file}`, import.meta.url)), file);
});
