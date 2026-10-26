import type { Page } from "./game";
import type { OfficeAction, OfficeMessage, OfficeState } from "./office";
import type { SponsorDeal, Sponsorships } from "./sponsors";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const pages = new Set<Page>(["overview", "profile", "inbox", "roster", "training", "scrims", "calendar", "standings", "patch", "heroes", "scouting", "next-series", "staff", "finances", "history", "world", "arcade"]);
function action(value: unknown): OfficeAction | undefined {
  if (!object(value)) return;
  if (value.kind === "tournament" && typeof value.eventId === "string") return { kind: value.kind, eventId: value.eventId };
  if (value.kind === "player" && typeof value.playerId === "string") return { kind: value.kind, playerId: value.playerId };
  if (value.kind === "patch" && typeof value.patchId === "string") return { kind: value.kind, patchId: value.patchId };
  if (value.kind === "page" && pages.has(value.page as Page)) return { kind: value.kind, page: value.page as Page };
}

/** Recover optional metadata independently so a partial block cannot strand a
 * valid campaign after loading. Keep valid notices and their handling state. */
export function normalizeOffice(value: unknown): OfficeState | undefined {
  if (!object(value)) return;
  const messages: OfficeMessage[] = [];
  for (const row of Array.isArray(value.messages) ? value.messages : []) {
    if (!object(row) || !["id", "at", "sender", "subject", "body"].every(key => typeof row[key] === "string")
      || !["tournaments", "contracts", "sponsors", "club", "patches", "scrims"].includes(row.category as string)) continue;
    const message = { ...row, action: action(row.action) } as unknown as OfficeMessage;
    if (!finite(message.createdWeek)) delete message.createdWeek;
    if (!object(message.expired) || typeof message.expired.at !== "string" || typeof message.expired.reason !== "string") delete message.expired;
    messages.push(message);
  }
  const unique = [...new Map(messages.map(message => [message.id, message])).values()];
  const registrations: OfficeState["registrations"] = Object.fromEntries(Object.entries(object(value.registrations) ? value.registrations : {})
    .filter((entry): entry is [string, { status: "reserved" | "declined"; at: string }] => object(entry[1])
      && (entry[1].status === "reserved" || entry[1].status === "declined") && typeof entry[1].at === "string"));
  const sponsorTerms = (Array.isArray(value.sponsorTerms) ? value.sponsorTerms : []).filter(row => object(row)
    && typeof row.id === "string" && typeof row.name === "string" && finite(row.signedAt) && finite(row.expiresAt) && finite(row.weekly));
  return { messages: unique, registrations, sponsorTerms: sponsorTerms as OfficeState["sponsorTerms"],
    seen: [...new Set([...(Array.isArray(value.seen) ? value.seen.filter((id): id is string => typeof id === "string") : []), ...unique.map(m => m.id)])],
    ...(typeof value.lastPatchId === "string" ? { lastPatchId: value.lastPatchId } : {}) };
}

export function normalizeSponsorships(value: unknown): Sponsorships | undefined {
  if (!object(value)) return;
  const deals = (Array.isArray(value.deals) ? value.deals : []).filter(row => object(row)
    && ["sponsorId", "teamId", "teamName"].every(key => typeof row[key] === "string")
    && finite(row.weekly) && row.weekly >= 0 && finite(row.bonus) && row.bonus >= 0
    && finite(row.weeks) && row.weeks > 0 && finite(row.mediaHours) && row.mediaHours >= 0
    && finite(row.signedAt) && finite(row.expiresAt) && row.expiresAt > row.signedAt) as SponsorDeal[];
  return { deals, releasedAt: Object.fromEntries(Object.entries(object(value.releasedAt) ? value.releasedAt : {}).filter((entry): entry is [string, number] => finite(entry[1]))) };
}
