import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, SAVE_KEY } from "../src/game";
import { readCampaignLibrary, saveCampaignSlot } from "../src/campaign-library";

function memoryStorage(initial: [string, string][] = []) {
  const data = new Map(initial);
  const storage: Storage = {
    get length() { return data.size; },
    key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
    clear: () => { data.clear(); },
  };
  return { data, storage };
}
const prefix = "aegis-manager-slot-v1:";

test("opening the library reads the original save without writing or changing its clock and roster", () => {
  const campaign = createCampaign(DEFAULT_SETTINGS), raw = JSON.stringify(campaign);
  const { storage, data } = memoryStorage([[SAVE_KEY, raw]]);
  const before = [...data];
  const library = readCampaignLibrary(storage);
  assert.equal(library.error, ""); assert.equal(library.slots.length, 1);
  assert.equal(library.slots[0].id, "legacy");
  assert.equal(library.slots[0].campaign.cash, campaign.cash);
  assert.equal(library.slots[0].campaign.week, campaign.week);
  assert.deepEqual(library.slots[0].campaign.roster, campaign.roster);
  assert.deepEqual([...data], before);
});

test("starting another campaign archives the original bytes and keeps independent updates and reloads", () => {
  const original = createCampaign(DEFAULT_SETTINGS), raw = JSON.stringify(original);
  const next = createCampaign({ ...DEFAULT_SETTINGS, team: "Another club", clubMode: "custom" });
  const { storage, data } = memoryStorage([[SAVE_KEY, raw]]);
  saveCampaignSlot("new-career", next, storage);
  assert.equal(JSON.parse(data.get(`${prefix}legacy`)!).data, raw);
  assert.equal(readCampaignLibrary(storage).slots.length, 2);
  const changed = { ...next, cash: next.cash + 123, week: next.week + 1 };
  saveCampaignSlot("new-career", changed, storage);
  const reloaded = readCampaignLibrary(storage).slots;
  assert.equal(reloaded.find(slot => slot.id === "new-career")!.campaign.cash, changed.cash);
  assert.equal(reloaded.find(slot => slot.id === "legacy")!.campaign.cash, original.cash);
  assert.equal(JSON.parse(data.get(`${prefix}legacy`)!).data, raw);
  assert.equal(JSON.parse(data.get(SAVE_KEY)!).cash, changed.cash);
  // Switching back updates only the selected original career.
  saveCampaignSlot("legacy", { ...original, cash: 777 }, storage);
  assert.equal(readCampaignLibrary(storage).slots.find(slot => slot.id === "new-career")!.campaign.cash, changed.cash);
  assert.equal(data.size, 3);
});

test("a fresh campaign does not create a duplicate legacy save on its next autosave", () => {
  const { storage } = memoryStorage(), campaign = createCampaign(DEFAULT_SETTINGS);
  saveCampaignSlot("fresh", campaign, storage);
  saveCampaignSlot("fresh", { ...campaign, cash: 99 }, storage);
  assert.deepEqual(readCampaignLibrary(storage).slots.map(slot => slot.id), ["fresh"]);
});

test("damaged slots are retained while valid campaigns and optional-field recovery stay available", () => {
  const { storage, data } = memoryStorage();
  const campaign = createCampaign(DEFAULT_SETTINGS);
  saveCampaignSlot("good", campaign, storage);
  data.set(`${prefix}broken`, "{bad json");
  data.set(`${prefix}invalid`, JSON.stringify({ data: "null" }));
  const malformed = { ...campaign, office: { messages: [null], registrations: null } };
  data.set(`${prefix}recoverable`, JSON.stringify({ savedAt: "invalid", data: JSON.stringify(malformed) }));
  const library = readCampaignLibrary(storage);
  assert.equal(library.slots.length, 2);
  assert.match(library.error, /could not be read/);
  assert.equal(library.slots.find(slot => slot.id === "recoverable")!.savedAt, null);
  assert.equal(data.get(`${prefix}broken`), "{bad json");
});

test("quota failure when adding a campaign preserves the original save and its archive", () => {
  const campaign = createCampaign(DEFAULT_SETTINGS), raw = JSON.stringify(campaign);
  const { storage, data } = memoryStorage([[SAVE_KEY, raw]]);
  const setItem = storage.setItem;
  storage.setItem = (key, value) => { if (key === `${prefix}new`) throw new Error("QuotaExceededError"); setItem(key, value); };
  assert.throws(() => saveCampaignSlot("new", { ...campaign, cash: 1 }, storage), /Quota/);
  assert.equal(data.get(SAVE_KEY), raw);
  assert.equal(JSON.parse(data.get(`${prefix}legacy`)!).data, raw);
  assert.equal(readCampaignLibrary(storage).slots[0].campaign.cash, campaign.cash);
});

test("creating a campaign also preserves an unreadable original save for recovery", () => {
  const raw = "{incomplete original data";
  const { storage, data } = memoryStorage([[SAVE_KEY, raw]]);
  saveCampaignSlot("fresh", createCampaign(DEFAULT_SETTINGS), storage);
  assert.equal(JSON.parse(data.get(`${prefix}legacy`)!).data, raw);
  assert.equal(readCampaignLibrary(storage).slots.length, 1);
  assert.match(readCampaignLibrary(storage).error, /could not be read/);
});

test("the authoritative slot survives a full compatibility mirror and unavailable storage is reported", () => {
  const { storage } = memoryStorage(), setItem = storage.setItem;
  storage.setItem = (key, value) => { if (key === SAVE_KEY) throw new Error("Quota"); setItem(key, value); };
  assert.doesNotThrow(() => saveCampaignSlot("fresh", createCampaign(DEFAULT_SETTINGS), storage));
  assert.equal(readCampaignLibrary(storage).slots.length, 1);
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("SecurityError"); } });
  try { assert.match(readCampaignLibrary().error, /unavailable/); }
  finally { if (prior) Object.defineProperty(globalThis, "localStorage", prior); else Reflect.deleteProperty(globalThis, "localStorage"); }
});
