import records from "./data/sponsors.json";
import world from "./data/world.json";
import type { Campaign, Training } from "./game";
import { campaignWeek } from "./contracts";
import { SPONSOR_NEGOTIATOR_ID, SPONSOR_NEGOTIATION_BONUS, staffCatalog } from "./staff";

export type SponsorBenefit = "training" | "recovery" | "morale" | "analytics" | "audience";
export interface Sponsor {
  id: string; name: string; category: string; from: number;
  evidence: string; association: string; preferredClub?: string;
  source: string; sourceTitle: string;
  weekly: number; bonus: number; requirement: number; benefit: SponsorBenefit;
}
export const sponsors = records as Sponsor[];
export const SPONSOR_LIMIT = 5;
export interface SponsorOffer { weekly: number; bonus: number; weeks: number; mediaHours: number }
export interface SponsorDeal extends SponsorOffer {
  sponsorId: string; teamId: string; teamName: string; signedAt: number; expiresAt: number;
}
export interface Sponsorships { deals: SponsorDeal[]; releasedAt: Record<string, number> }
const hash = (value: string) => [...value].reduce((sum, letter) => (sum * 31 + letter.charCodeAt(0)) >>> 0, 7);
export const managedSponsorTeam = (c: Campaign) => c.world?.managedTeamId ?? "managed";
export const sponsorWeeksLeft = (c: Campaign, d: SponsorDeal) => Math.max(0, d.expiresAt - campaignWeek(c));
export const sponsorDate = (week: number, c?: Campaign) => c?.calendar
  ? new Date(Date.parse(c.calendar.origin) + (week - c.calendar.contractEpoch) * 604800000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
  : `${Math.floor(week / 18)} · Week ${week % 18 + 1}`;
export const benefitLabels: Record<SponsorBenefit, string> = {
  training: "+0.10 weekly attribute development",
  recovery: "+2 weekly energy",
  morale: "+1 weekly happiness",
  analytics: "+0.10 development on vision / intuition / map awareness",
  audience: "+0.25 weekly reputation",
};
export function initialSponsorships(c: Campaign): Sponsorships {
  const deals: SponsorDeal[] = [];
  const now = campaignWeek(c);
  // Historical associations seed a fictional, globally exclusive market. Never
  // invent a Dota club for an association that only exists in another esport.
  for (const s of sponsors.filter((s) => s.from <= c.year)) {
    const club = c.world?.clubs.find((t) => t.id === s.preferredClub && t.active !== false);
    if (!club || club.id === managedSponsorTeam(c) || deals.filter((d) => d.teamId === club.id).length >= SPONSOR_LIMIT) continue;
    deals.push({ sponsorId: s.id, teamId: club.id, teamName: club.name,
      weekly: s.weekly, bonus: 0, weeks: 6 + hash(s.id) % 13, mediaHours: 1,
      signedAt: now, expiresAt: now + 6 + hash(s.id) % 13 });
  }
  return { deals, releasedAt: {} };
}
export const sponsorMarket = (c: Campaign) => c.sponsorships ?? initialSponsorships(c);
export const activeSponsorDeals = (c: Campaign) => sponsorMarket(c).deals.filter((d) => d.signedAt <= campaignWeek(c) && d.expiresAt > campaignWeek(c));
export const teamSponsorDeals = (c: Campaign) => activeSponsorDeals(c).filter((d) => d.teamId === managedSponsorTeam(c));
export const legacySponsors = (c: Campaign) => world.sponsors.filter((s) => c.sponsorIds.includes(s.id));
export const sponsorSlotsUsed = (c: Campaign) => teamSponsorDeals(c).length + legacySponsors(c).length;
export const sponsorshipIncome = (c: Campaign) => teamSponsorDeals(c).reduce((sum, d) => sum + d.weekly, 0) + legacySponsors(c).reduce((sum, s) => sum + s.weekly, 0);
export function sponsorBenefits(c: Campaign, focus?: Training) {
  const kinds = teamSponsorDeals(c).map((d) => sponsors.find((s) => s.id === d.sponsorId)?.benefit);
  const count = (kind: SponsorBenefit) => kinds.filter((k) => k === kind).length;
  const mediaHours = teamSponsorDeals(c).reduce((sum, d) => sum + d.mediaHours, 0);
  return {
    growth: Math.min(0.3, count("training") * 0.1 + (["Vision", "Intuition", "Map awareness"].includes(focus ?? "") ? count("analytics") * 0.1 : 0)),
    energy: Math.min(6, count("recovery") * 2) - mediaHours,
    happiness: Math.min(3, count("morale")),
    reputation: Math.min(0.5, count("audience") * 0.25),
    mediaHours,
  };
}
export function sponsorBlocker(c: Campaign, s: Sponsor): string | null {
  if (c.year < s.from) return `Available from ${s.from}.`;
  const holder = activeSponsorDeals(c).find((d) => d.sponsorId === s.id);
  if (holder) return holder.teamId === managedSponsorTeam(c) ? "Your agreement is active. Negotiate again after expiry." : `Exclusive to ${holder.teamName} until ${sponsorDate(holder.expiresAt, c)}.`;
  if (sponsorSlotsUsed(c) >= SPONSOR_LIMIT) return "All five sponsor slots are occupied. Wait for an agreement to expire.";
  if (c.reputation < s.requirement) return `${s.requirement} reputation required; you have ${Number(c.reputation.toFixed(2))}.`;
  return null;
}
export function initialSponsorOffer(s: Sponsor): SponsorOffer {
  return { weekly: s.weekly, bonus: s.bonus, weeks: 18, mediaHours: 1 };
}
export const sponsorNegotiator = (c: Campaign) => c.staffIds.includes(SPONSOR_NEGOTIATOR_ID)
  ? staffCatalog.find(s => s.id === SPONSOR_NEGOTIATOR_ID) : undefined;

/** Total package budget per week, including the amortized signing bonus. */
function sponsorBudget(c: Campaign, s: Sponsor, weeks: number, mediaHours: number, assisted = !!sponsorNegotiator(c)) {
  return Math.floor((s.weekly + s.bonus / 18) * (0.8 + Math.min(100, Math.max(0, c.reputation)) * 0.004 + mediaHours * 0.1 + (weeks === 36 ? 0.1 : weeks === 6 ? -0.1 : 0))
    * (assisted ? 1 + SPONSOR_NEGOTIATION_BONUS : 1));
}

/** Advice uses the same budget and legal gates as signing. It never signs. */
export function recommendedSponsorOffer(c: Campaign, s: Sponsor, weeks = 18, mediaHours = 1, requestedBonus = s.bonus): SponsorOffer | null {
  if (!sponsorNegotiator(c) || sponsorBlocker(c, s) || ![6, 18, 36].includes(weeks) || ![0, 1, 2].includes(mediaHours)
    || !Number.isSafeInteger(requestedBonus) || requestedBonus < 0 || requestedBonus > 1000000) return null;
  const budget = sponsorBudget(c, s, weeks, mediaHours);
  const bonus = Math.min(requestedBonus, Math.max(0, (budget - 100) * weeks));
  return { weekly: Math.min(100000, Math.max(100, Math.floor(budget - bonus / weeks))), bonus, weeks, mediaHours };
}

export function sponsorRecommendations(c: Campaign, weeks = 18, mediaHours = 1) {
  if (!sponsorNegotiator(c)) return [];
  return sponsors.flatMap(sponsor => {
    const offer = recommendedSponsorOffer(c, sponsor, weeks, mediaHours);
    if (!offer) return [];
    const total = offer.weekly * weeks + offer.bonus;
    const unassistedBudget = sponsorBudget(c, sponsor, weeks, mediaHours, false);
    // Compare complete packages, so a short-term bonus is never mistaken for weekly income.
    const extraTotal = Math.max(0, total - unassistedBudget * weeks);
    return [{ sponsor, offer, total, weeklyValue: total / weeks, extraTotal }];
  }).sort((a, b) => b.total - a.total || a.sponsor.id.localeCompare(b.sponsor.id));
}

export function assessSponsorOffer(c: Campaign, s: Sponsor, o: SponsorOffer): { status: "accepted" | "counter" | "blocked"; message: string; counter?: SponsorOffer } {
  if (!Number.isSafeInteger(o.weekly) || o.weekly < 100 || o.weekly > 100000 || !Number.isSafeInteger(o.bonus) || o.bonus < 0 || o.bonus > 1000000 || ![6, 18, 36].includes(o.weeks) || ![0, 1, 2].includes(o.mediaHours))
    return { status: "blocked", message: "Use whole-dollar weekly support ($100–$100,000), a $0–$1,000,000 bonus, 6/18/36 weeks, and 0/1/2 media hours." };
  const blocker = sponsorBlocker(c, s);
  if (blocker) return { status: "blocked", message: blocker };
  const budget = sponsorBudget(c, s, o.weeks, o.mediaHours);
  if (o.weekly + o.bonus / o.weeks <= budget) return { status: "accepted", message: "Package agreed. Your signing bonus is paid now; weekly support and benefits end at expiry." };
  const bonus = Math.min(o.bonus, Math.max(0, (budget - 100) * o.weeks));
  const counter = { ...o, bonus, weekly: Math.max(100, Math.floor(budget - bonus / o.weeks)) };
  return { status: "counter", message: "That package exceeds our budget. More media time or a longer commitment can improve support. You can also ask for a smaller bonus.", counter };
}
export function negotiateSponsor(c: Campaign, id: string, offer: SponsorOffer): { campaign: Campaign; status: "accepted" | "counter" | "blocked"; message: string; counter?: SponsorOffer } {
  const sponsor = sponsors.find((s) => s.id === id);
  if (!sponsor) return { campaign: c, status: "blocked", message: "Unknown sponsor." };
  const response = assessSponsorOffer(c, sponsor, offer);
  if (response.status !== "accepted") return { ...response, campaign: c };
  const next = structuredClone(c);
  next.sponsorships = structuredClone(sponsorMarket(c));
  const now = campaignWeek(c);
  next.sponsorships.deals = next.sponsorships.deals.filter((d) => d.sponsorId !== id);
  next.sponsorships.deals.push({ ...offer, sponsorId: id, teamId: managedSponsorTeam(c), teamName: c.settings.team, signedAt: now, expiresAt: now + offer.weeks });
  next.cash += offer.bonus;
  next.transactions = [{ year: c.year, week: c.week, label: `${sponsor.name} signing bonus`, amount: offer.bonus }, ...next.transactions].slice(0, 80);
  next.log = [`${sponsor.name} signed for ${offer.weeks} weeks with ${offer.mediaHours} media ${offer.mediaHours === 1 ? "hour" : "hours"} per player each week.`, ...next.log].slice(0, 30);
  return { ...response, campaign: next };
}

// Run after the clock and historical club imports advance. Expired deals are
// removed once; every released brand stays available for at least one full week.
export function advanceSponsorMarket(c: Campaign) {
  const market = c.sponsorships ??= initialSponsorships(c);
  const now = campaignWeek(c);
  const managed = managedSponsorTeam(c);
  market.deals = market.deals.filter((d) => {
    const club = c.world?.clubs.find((t) => t.id === d.teamId && t.active !== false);
    if (d.expiresAt > now && (d.teamId === managed || club)) return true;
    market.releasedAt[d.sponsorId] = now;
    if (d.teamId === managed) c.log = [`${sponsors.find((s) => s.id === d.sponsorId)?.name ?? d.sponsorId} agreement expired. Its income, benefits and media commitments have ended; the sponsor is available.`, ...c.log].slice(0, 30);
    return false;
  });
  const clubs = c.world?.clubs.filter((t) => t.active !== false && t.id !== managed) ?? [];
  for (const s of sponsors) {
    if (s.from > c.year || market.deals.some((d) => d.sponsorId === s.id) || now - (market.releasedAt[s.id] ?? now - 2) < 2 || (hash(s.id) + now) % 5 !== 0) continue;
    const eligible = clubs.filter((t) => market.deals.filter((d) => d.teamId === t.id).length < SPONSOR_LIMIT);
    if (!eligible.length) continue;
    const club = eligible[(hash(s.id) + now) % eligible.length];
    market.deals.push({ sponsorId: s.id, teamId: club.id, teamName: club.name, weekly: s.weekly, bonus: 0, weeks: 18, mediaHours: 1, signedAt: now, expiresAt: now + 18 });
  }
}
