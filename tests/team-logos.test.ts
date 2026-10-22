import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { allRosterReferences, historicalArchive } from "../src/history";
import { teamIdForName, teamInitials, teamLogoCatalog, teamLogoFor } from "../src/team-logos";

test("every historical club has audited logo coverage and every referenced asset ships locally", () => {
  const expected = new Set(allRosterReferences.map((t) => t.id));
  assert.deepEqual(new Set(Object.keys(teamLogoCatalog)), expected);
  for (const club of historicalArchive.opening) assert.ok(teamLogoFor(club.id, 2011), club.name);
  for (const [id, club] of Object.entries(teamLogoCatalog)) {
    assert.equal(club.status, club.versions.length ? "sourced" : "missing", id);
    assert.deepEqual(club.versions.map((v) => v.year), [...new Set(club.versions.map((v) => v.year))].sort(), id);
    for (const logo of club.versions) {
      assert.match(logo.path, /^team-logos\/[a-f0-9]{20}\.webp$/);
      const path = resolve("public", logo.path);
      assert.ok(existsSync(path), `${id}: ${path}`);
      assert.equal(readFileSync(path).subarray(8, 12).toString(), "WEBP");
      assert.match(logo.source, /^https:\/\/liquipedia.net\/dota2\//);
      assert.match(logo.filePage, /^https:\/\/liquipedia.net\/commons\/File:/);
      assert.ok(logo.year >= club.firstYear && logo.year <= 2026);
    }
  }
});

test("dated logo selection preserves old seasons, sponsor eras and later rebrands", () => {
  assert.notEqual(teamLogoFor("navi", 2011)?.path, teamLogoFor("navi", 2026)?.path);
  assert.match(teamLogoFor("lgd", 2011)!.imageUrl, /LGD_Dota_Allstars/);
  assert.match(teamLogoFor("lgd", 2018)!.imageUrl, /PSG/);
  assert.doesNotMatch(teamLogoFor("lgd", 2024)!.imageUrl, /PSG/);
  assert.match(teamLogoFor("ig", 2023)!.imageUrl, /Invictus/);
  assert.match(teamLogoFor("ig", 2024)!.imageUrl, /G2/);
  assert.equal(teamLogoFor("navi", 2010), undefined);
  assert.equal(teamLogoFor("navi", 2036)?.path, teamLogoFor("navi", 2026)?.path);
});

test("unknown, custom and legacy identities never inherit another club's logo", () => {
  assert.equal(teamLogoFor("managed-custom", 2026), undefined);
  assert.equal(teamLogoFor(undefined, 2026), undefined);
  assert.equal(teamLogoFor("whb", 2011), undefined);
  assert.equal(teamLogoFor("fictional-team", 2026), undefined);
  assert.equal(teamLogoFor("navi", Number.NaN), undefined);
  assert.equal(teamInitials(" Atlas Esports "), "AE");
  assert.equal(teamInitials(""), "?");
});

test("historical name resolution respects era and distinguishes similarly named organizations", () => {
  assert.equal(teamIdForName("Team DK", 2011), "dk");
  assert.equal(teamIdForName("TeamDk", 2025), "teamdk");
  assert.equal(teamIdForName("TeamDk", 2011), "dk");
  assert.equal(teamIdForName("G2 x iG", 2024), "ig");
  assert.equal(teamIdForName("PSG.LGD", 2018), "lgd");
  assert.equal(teamIdForName("Team Falcons", 2011), undefined);
});
