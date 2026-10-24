import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";
import { dismissPatchIntroduction, normalizePatchIntroductions, syncPatchIntroductions } from "../src/patch-announcements";
import { historicalPatches, patchForSeason } from "../src/patches";
import { patchTrailers } from "../src/patch-trailers";
import { syncOffice } from "../src/office";

test("every historical and generated patch receives the same introduction queue", () => {
  for (const patch of [...historicalPatches, patchForSeason(2028, 1), patchForSeason(2028, 2)]) {
    const c = createCampaign({ ...DEFAULT_SETTINGS, year: patch.year });
    c.week = patch.phase === 1 ? 1 : 9;
    const before = JSON.stringify(c);
    const next = syncPatchIntroductions(c);
    assert.equal(JSON.stringify(c), before);
    assert.deepEqual(next.patchIntroductions?.pending, [patch.id]);
    assert.equal(syncPatchIntroductions(next), next);
  }
});

test("crossed updates remain ordered across reload and dismissal; notes can retain each exact patch ID", () => {
  let c = syncOffice(createCampaign(DEFAULT_SETTINGS));
  c = dismissPatchIntroduction(c, "2011.1");
  c = syncOffice({ ...c, year: 2012, week: 9 });
  assert.deepEqual(c.patchIntroductions?.pending, ["2011.2", "2012.1", "2012.2"]);
  c = syncOffice(JSON.parse(JSON.stringify(c)));
  c = dismissPatchIntroduction(c, "2011.2");
  assert.deepEqual(c.patchIntroductions?.pending, ["2012.1", "2012.2"]);
  c = dismissPatchIntroduction(dismissPatchIntroduction(c, "2012.1"), "2012.2");
  assert.deepEqual(syncOffice(c).patchIntroductions?.pending, []);
  assert.equal(dismissPatchIntroduction(c, "missing"), c);
});

test("existing milestone dismissals migrate without suppressing ordinary patches", () => {
  let c = createCampaign({ ...DEFAULT_SETTINGS, year: 2017 });
  c.seenPatchMilestones = ["journey"];
  c = syncPatchIntroductions(c);
  assert.deepEqual(c.patchIntroductions?.pending, []);
  c = syncPatchIntroductions({ ...c, week: 9 });
  assert.deepEqual(c.patchIntroductions?.pending, ["2017.2"]);
  c = syncPatchIntroductions({ ...c, year: 2023, week: 1 });
  c = dismissPatchIntroduction(c, "2023.1");
  assert.ok(c.seenPatchMilestones?.includes("frontiers"));
});

test("optional queue data normalizes safely and saved pending introductions survive loading", () => {
  assert.deepEqual(normalizePatchIntroductions({ pending: ["2017.1", "2017.1", "2017.2", "oops", null], dismissed: ["2017.1", "bad"] }), { dismissed: ["2017.1"], pending: ["2017.2"] });
  assert.equal(normalizePatchIntroductions([]), undefined);
  const c = syncPatchIntroductions(createCampaign(DEFAULT_SETTINGS));
  const storage = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: (id: string) => id === SAVE_KEY ? JSON.stringify(c) : null } as Storage;
    assert.deepEqual(readSave()?.patchIntroductions, c.patchIntroductions);
    globalThis.localStorage = { getItem: () => JSON.stringify({ ...c, patchIntroductions: "broken" }) } as unknown as Storage;
    const loaded = readSave()!;
    assert.ok(loaded && !loaded.patchIntroductions);
    assert.equal(loaded.cash, c.cash);
    assert.deepEqual(loaded.roster, c.roster);
  } finally { globalThis.localStorage = storage; }
});

test("verified hero trailers follow hero arrivals and remain separate from future releases", () => {
  assert.equal(patchTrailers(patchForSeason(2011, 2)).length, 0);
  assert.deepEqual(patchTrailers(patchForSeason(2017, 1)).map(v => v.id), ["journey", "monkey-king"]);
  assert.ok(patchTrailers(patchForSeason(2018, 1)).some(v => v.id === "dueling-fates"));
  assert.deepEqual(patchTrailers(patchForSeason(2020, 1)).map(v => v.id), ["mars-grimstroke", "snapfire", "void-spirit"]);
  assert.equal(patchTrailers(patchForSeason(2020, 2)).length, 0);
  assert.ok(patchTrailers(patchForSeason(2022, 1)).some(v => v.id === "marci"));
  assert.ok(patchTrailers(patchForSeason(2024, 1)).some(v => v.id === "muerta"));
  assert.deepEqual(patchTrailers(patchForSeason(2025, 1)).map(v => v.id), ["ringmaster", "kez"]);
  for (const p of historicalPatches) for (const video of patchTrailers(p)) {
    if (video.videoId) assert.match(video.videoId, /^[A-Za-z0-9_-]{11}$/);
    else assert.match(video.videoUrl!, /^https:\/\/cdn\.steamstatic\.com\/apps\/dota2\/videos\/.+\.mp4$/);
  }
});
