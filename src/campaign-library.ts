import { decodeSave, ROLES, SAVE_KEY, statNames } from "./game";
import type { Campaign } from "./game";
import LZString from 'lz-string';
const { compressToUTF16, decompressFromUTF16 } = LZString;

const SLOT_PREFIX = "aegis-manager-slot-v1:";
export interface CampaignSlot {
  id: string;
  savedAt: string | null;
  campaign: Campaign;
  recovered?: boolean;
  backup?: { savedAt: string | null; campaign: Campaign };
}
interface StoredCampaign { savedAt: string | null; data: string; encoding?: 'lz16'; backup?: StoredCampaign }
function unpack(row: StoredCampaign | undefined): string | null {
  if (!row || typeof row.data !== 'string' || row.data.length > 16_000_000) return null;
  return row.encoding === 'lz16' ? decompressFromUTF16(row.data) : row.encoding == null ? row.data : null;
}
const savedTime = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;
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
        let campaign = decodeSave(unpack(record));
        const backup = decodeSave(unpack(record.backup));
        const recovered = !campaign && !!backup;
        if (recovered) { campaign = backup; damaged = true; }
        if (!campaign) { damaged = true; continue; }
        slots.push({ id: key.slice(SLOT_PREFIX.length), campaign, recovered,
          savedAt: savedTime(recovered ? record.backup?.savedAt : record.savedAt),
          ...(backup ? { backup: { campaign: backup, savedAt: savedTime(record.backup.savedAt) } } : {}) });
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
    return { slots, error: damaged ? "A saved campaign could not be read. Its stored data has been kept. Available backups and other campaigns are shown below." : "" };
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
  let backup: StoredCampaign | undefined;
  try {
    const previous: StoredCampaign = JSON.parse(storage.getItem(`${SLOT_PREFIX}${id}`) ?? 'null');
    const raw = unpack(previous), valid = decodeSave(raw);
    if (valid && raw) {
      const sameDate = valid.calendar?.now === campaign.calendar?.now && valid.week === campaign.week && valid.year === campaign.year;
      backup = sameDate && previous.backup && decodeSave(unpack(previous.backup)) ? previous.backup : { savedAt: savedTime(previous.savedAt), data: compressToUTF16(raw), encoding: 'lz16' };
    } else if (previous?.backup && decodeSave(unpack(previous.backup))) backup = previous.backup;
  } catch { /* Retain unreadable stored data until a successful atomic replacement. */ }
  const compressed = data.length > 200_000;
  const record: StoredCampaign = { savedAt: new Date().toISOString(), data: compressed ? compressToUTF16(data) : data, ...(compressed ? { encoding: 'lz16' as const } : {}), ...(backup ? { backup } : {}) };
  storage.setItem(`${SLOT_PREFIX}${id}`, JSON.stringify(record));
  // Keep compatibility with the original reader. Slots are authoritative if this mirror is full.
  try { storage.setItem(SAVE_KEY, data); }
  catch { /* The authoritative slot was saved; the compatibility mirror is optional. */ }
}

export function exportCampaign(campaign: Campaign): string {
  return JSON.stringify({ format: 'aegis-manager', version: 1, exportedAt: new Date().toISOString(), campaign });
}
export function importCampaign(value: string): Campaign {
  if (value.length > 32_000_000) throw new Error('Campaign file is too large (32 MB maximum).');
  let source: unknown;
  try { source = JSON.parse(value); } catch { throw new Error('This file is not valid JSON.'); }
  const envelope = source as { format?: string; version?: number; campaign?: unknown } | null;
  if (envelope?.format && (envelope.format !== 'aegis-manager' || envelope.version !== 1)) throw new Error('Unsupported campaign export format.');
  const c = decodeSave(JSON.stringify(envelope?.format ? envelope.campaign : source));
  if (!c || typeof c.settings.team !== 'string' || c.players.length > 10000 || new Set(c.players.map(p=>p?.id)).size !== c.players.length || c.players.some(p =>
    !p || typeof p.id !== 'string' || typeof p.name !== 'string' || !ROLES.includes(p.role as typeof ROLES[number]) || !p.stats
    || Object.keys(statNames).some(key => !Number.isFinite(p.stats[key as keyof PlayerStats]) || p.stats[key as keyof PlayerStats] < 0 || p.stats[key as keyof PlayerStats] > 100)
    || !Number.isFinite(p.energy) || !Number.isFinite(p.happiness) || !Number.isFinite(p.wage) || !p.playstyles || typeof p.playstyles !== 'object'
    || Object.values(p.playstyles).some(n=>n!=null&&(!Number.isFinite(n)||n<1||n>10)))) throw new Error('This file does not contain a valid Aegis Manager campaign.');
  return c;
}
type PlayerStats = Campaign['players'][number]['stats'];
