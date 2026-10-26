import { decodeSave, SAVE_KEY } from "./game";
import type { Campaign } from "./game";

const SLOT_PREFIX = "aegis-manager-slot-v1:";
export interface CampaignSlot {
  id: string;
  savedAt: string | null;
  campaign: Campaign;
}
export interface CampaignLibrary {
  slots: CampaignSlot[];
  error: string;
}

/** Reading the launcher never rewrites or advances an existing campaign. */
export function readCampaignLibrary(storage?: Storage): CampaignLibrary {
  const slots: CampaignSlot[] = [];
  let damaged = false;
  try {
    storage ??= localStorage;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(SLOT_PREFIX)) continue;
      try {
        const record = JSON.parse(storage.getItem(key)!);
        const campaign = decodeSave(typeof record.data === "string" ? record.data : null);
        if (!campaign) { damaged = true; continue; }
        slots.push({ id: key.slice(SLOT_PREFIX.length), campaign,
          savedAt: typeof record.savedAt === "string" && Number.isFinite(Date.parse(record.savedAt)) ? record.savedAt : null });
      } catch { damaged = true; }
    }
    // The original single save remains directly loadable until first saved to a slot.
    if (!slots.length) {
      const raw = storage.getItem(SAVE_KEY);
      const campaign = decodeSave(raw);
      if (campaign) slots.push({ id: "legacy", savedAt: null, campaign });
      else if (raw) damaged = true;
    }
    slots.sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? "") || a.id.localeCompare(b.id));
    return { slots, error: damaged ? "A saved campaign could not be read. Its stored data has been kept; your other campaigns are available below." : "" };
  } catch {
    return { slots, error: "Browser storage is unavailable. Enable local storage to load or save campaigns." };
  }
}

/** Write the slot first; quota errors never overwrite another campaign. */
export function saveCampaignSlot(id: string, campaign: Campaign, storage: Storage = localStorage): void {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid campaign slot");
  const data = JSON.stringify(campaign);
  // Before creating the first new slot, preserve the old single campaign verbatim.
  if (id !== "legacy" && !storage.getItem(`${SLOT_PREFIX}${id}`) && !storage.getItem(`${SLOT_PREFIX}legacy`)) {
    const library = readCampaignLibrary(storage);
    const old = storage.getItem(SAVE_KEY);
    if (old && (!library.slots.length || library.slots.some(slot => slot.id === "legacy"))) {
      storage.setItem(`${SLOT_PREFIX}legacy`, JSON.stringify({ savedAt: null, data: old }));
    }
  }
  storage.setItem(`${SLOT_PREFIX}${id}`, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  // Keep compatibility with the original reader. Slots are authoritative if this mirror is full.
  try { storage.setItem(SAVE_KEY, data); }
  catch { /* The authoritative slot was saved; the compatibility mirror is optional. */ }
}
