import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY, weeklyIncome } from "../src/game";
import { syncOffice } from "../src/office";
import { managedSponsorTeam, sponsors } from "../src/sponsors";
import { campaignWeek } from "../src/contracts";

function load(value: unknown) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(value) : null } });
  try { return readSave(); }
  finally { if (prior) Object.defineProperty(globalThis, "localStorage", prior); else Reflect.deleteProperty(globalThis, "localStorage"); }
}

test("partial saved inbox metadata cannot crash campaign startup or duplicate retained messages", () => {
  const original = syncOffice(createCampaign(DEFAULT_SETTINGS));
  const retained = original.office!.messages.find(m => m.id === "office-welcome")!;
  retained.read = true; retained.archived = true;
  const loaded = load({ ...original, office: { messages: [retained, null], registrations: null } })!;
  assert.ok(loaded);
  const synced = syncOffice(loaded);
  const matches = synced.office!.messages.filter(m => m.id === retained.id);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].read, true); assert.equal(matches[0].archived, true);
  assert.equal(synced.cash, original.cash); assert.deepEqual(synced.roster, original.roster);
});

test("malformed optional sponsor entries cannot crash the menu or poison cash with NaN", () => {
  const c = createCampaign(DEFAULT_SETTINGS), week = campaignWeek(c);
  const valid = { sponsorId: sponsors[0].id, teamId: managedSponsorTeam(c), teamName: c.settings.team,
    weekly: 1234, bonus: 0, weeks: 18, mediaHours: 1, signedAt: week, expiresAt: week + 18 };
  const loaded = load({ ...c, sponsorships: { deals: [null, valid, { ...valid, sponsorId: "broken", weekly: "oops" }], releasedAt: null } })!;
  assert.ok(loaded);
  assert.equal(weeklyIncome(loaded), 1234);
  assert.deepEqual(loaded.sponsorships!.deals, [valid]);
  assert.doesNotThrow(() => syncOffice(loaded));
  assert.deepEqual(loaded.players, c.players);
  assert.ok(load({ ...c, sponsorships: { deals: null } }));
});
