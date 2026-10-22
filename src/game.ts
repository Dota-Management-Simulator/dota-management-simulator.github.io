import world from "./data/world.json";
import { simulateBestOfThree, seededRandom } from "./battle";
import type { BattleConfig, SeriesSummary } from "./battle";
import { createHistoricalWorld, clubForPlayer, recruitHistoricalPlayer, postTiShuffle, getStartingTeams, customClubNameAvailable, activeClubs } from "./history";
import type { HistoricalWorld } from "./history";
import { heroUnlockYear, heroesArrivingIn } from "./heroes";
import { attributeNames, roundTraining } from "./training";
import { applyPlayerPractice, developWorldPlayers } from "./development";
import type { TrainingSchedule } from "./training";
export type { Training } from "./training";
import type { Training } from "./training";
import { assessOffer, campaignWeek, releaseCost, weeklyPractice } from "./contracts";
import type { ContractOffer, PlayerContract } from "./contracts";
import { advanceSponsorMarket, initialSponsorships, sponsorBenefits, sponsorSlotsUsed, sponsorshipIncome } from "./sponsors";
import type { Sponsorships } from "./sponsors";
import type { HistoricalCalendar } from "./tournament-types";
import type { OfficeState } from "./office";
import { playerTournamentLock } from "./tournament-locks";
import { historicalTournaments, nextTournamentFixture, utcTime } from "./tournaments";
import { normalizeBranding } from "./branding";
import type { ClubBranding } from "./branding";

export const ROLES = [
  "Carry",
  "Mid",
  "Offlane",
  "Soft support",
  "Hard support",
] as const;
export type Role = (typeof ROLES)[number];
export type Difficulty = "Club" | "Contender" | "Legend";
export type Player = Omit<(typeof world.players)[number], "age"> & {
  age: number | null;
  historical?: { aliases: string[]; source: string; date: string; team: string; role: string; roleEvidence: "adapted" };
};
export type Page =
  | "overview"
  | "inbox"
  | "roster"
  | "training"
  | "calendar"
  | "standings"
  | "patch"
  | "scouting"
  | "staff"
  | "finances"
  | "history"
  | "world";
export interface Settings {
  team: string;
  region: string;
  difficulty: Difficulty;
  year: number;
  shuffle: boolean;
  injuries: boolean;
  clubMode?: "historical" | "custom";
  historicalTeamId?: string;
  branding?: ClubBranding;
}
export interface Result {
  eventId: string;
  event: string;
  year: number;
  week: number;
  won: boolean;
  skipped?: boolean;
  prize: number;
  points: number;
  opponent: string;
  score: string;
  series?: SeriesSummary;
  tournamentId?: string;
}
export interface Campaign {
  version: 1;
  settings: Settings;
  year: number;
  week: number;
  cash: number;
  reputation: number;
  points: number;
  qualified: boolean;
  players: Player[];
  roster: string[];
  training: Record<string, Training>;
  trainingSchedules?: Record<string, TrainingSchedule>;
  sponsorIds: string[];
  sponsorships?: Sponsorships;
  staffIds: string[];
  results: Result[];
  log: string[];
  transactions: { week: number; year: number; label: string; amount: number }[];
  world?: HistoricalWorld;
  contracts?: Record<string, PlayerContract>;
  calendar?: HistoricalCalendar;
  office?: OfficeState;
}
export const DEFAULT_SETTINGS: Settings = {
  team: "Natus Vincere",
  region: "Eastern Europe",
  difficulty: "Contender",
  year: 2011,
  shuffle: true,
  injuries: false,
  clubMode: "historical",
  historicalTeamId: "navi",
};
export const data = world;
export const statNames: Record<string, string> = attributeNames;
export const events = [
  {
    id: "open",
    name: "Founders Open",
    week: 3,
    tier: "Open circuit",
    prize: 8000,
    points: 25,
    level: 65,
    location: "Online",
    kind: "circuit",
  },
  {
    id: "invitational",
    name: "Meridian Invitational",
    week: 6,
    tier: "Invitational",
    prize: 15000,
    points: 35,
    level: 74,
    location: "Online",
    kind: "circuit",
  },
  {
    id: "masters",
    name: "Summit Masters",
    week: 9,
    tier: "Premier circuit",
    prize: 25000,
    points: 50,
    level: 80,
    location: "Studio LAN",
    kind: "circuit",
  },
  {
    id: "qualifier",
    name: "Regional Qualifier",
    week: 12,
    tier: "Road to TI",
    prize: 6000,
    points: 20,
    level: 77,
    location: "Regional LAN",
    kind: "qualifier",
  },
  {
    id: "ti",
    name: "The International",
    week: 16,
    tier: "The ultimate stage",
    prize: 100000,
    points: 0,
    level: 87,
    location: "Championship LAN",
    kind: "ti",
  },
];
export type GameEvent = (typeof events)[number];
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const shortMoney = (n: number) =>
  Math.abs(n) >= 1000
    ? `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1000).toFixed(1)}k`
    : money(n);
export const average = (n: number[]) =>
  n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : 0;
export const rating = (p: Player) => average(Object.values(p.stats));
export const teamPlayers = (c: Campaign) =>
  c.roster.map((id) => c.players.find((p) => p.id === id)!).filter(Boolean);
export const weeklyWages = (c: Campaign) =>
  teamPlayers(c).reduce((s, p) => s + p.wage, 0) +
  data.staff
    .filter((s) => c.staffIds.includes(s.id))
    .reduce((s, p) => s + p.weekly, 0);
export const weeklyIncome = sponsorshipIncome;
export const eventResult = (c: Campaign, id: string) =>
  c.results.find((r) => r.year === c.year && r.eventId === id);
export const nextEvent = (c: Campaign) =>
  events.find((e) => e.week >= c.week && !eventResult(c, e.id));
export const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));
export function createCampaign(settings: Settings): Campaign {
  const choices = getStartingTeams(settings.year);
  const chosen = choices.find((t) => t.id === settings.historicalTeamId) ?? choices[0];
  const name = settings.clubMode === "custom" ? settings.team.trim() || "Atlas Esports" : chosen.name;
  if (settings.clubMode === "custom" && !customClubNameAvailable(name, chosen.id)) throw new Error("That club name is already in use.");
  const historical = createHistoricalWorld(chosen.id, settings.clubMode === "custom" ? name : undefined, settings.year);
  const players = historical.players;
  const state = historical.state;
  const campaign: Campaign = {
    version: 1,
    settings: { ...settings, team: name, region: chosen.region, historicalTeamId: chosen.id,
      ...(settings.branding ? { branding: normalizeBranding(settings.branding) } : {}) },
    year: settings.year,
    week: 1,
    cash:
      settings.difficulty === "Club"
        ? 150000
        : settings.difficulty === "Legend"
          ? 65000
          : 100000,
    reputation: 10,
    points: 0,
    qualified: false,
    players,
    roster: [...historical.managed.roster],
    training: Object.fromEntries(players.map((p) => [p.id, "Balanced"])),
    world: state,
    sponsorIds: [],
    staffIds: [],
    results: [],
    log: [settings.year === 2011 ? "2011 historical world loaded. Regional references retain their original observation dates." : `${settings.year} begins with roster and hero imports through ${state.dataThroughYear}. This season's additions enter after TI.`],
    transactions: [],
  };
  campaign.sponsorships = initialSponsorships(campaign);
  return campaign;
}
function note(c: Campaign, text: string) {
  c.log = [text, ...c.log].slice(0, 30);
}
function transaction(c: Campaign, label: string, amount: number) {
  c.cash += amount;
  c.transactions = [
    { week: c.week, year: c.year, label, amount },
    ...c.transactions,
  ].slice(0, 80);
}
export function advanceWeek(current: Campaign): Campaign {
  if (current.calendar) {
    const now = Date.parse(current.calendar.now);
    const pending = current.calendar.runs.filter(r => r.state === "playing").map(r => nextTournamentFixture(r)).filter(f => !!f).map(f => utcTime(f!.at));
    const target = pending.length ? Math.min(now + 604800000, Math.max(now, Math.min(...pending))) : now + 604800000;
    return advanceCalendarTo(current, new Date(target).toISOString());
  }
  const c = structuredClone(current);
  reconcileHistoricalImports(c);
  c.sponsorships ??= initialSponsorships(c);
  for (const e of events.filter(
    (e) => e.week === c.week && !eventResult(c, e.id),
  )) {
    c.results.push({
      eventId: e.id,
      event: e.name,
      year: c.year,
      week: c.week,
      won: false,
      skipped: true,
      prize: 0,
      points: 0,
      opponent: "—",
      score: "Skipped",
    });
    note(c, `${e.name} skipped. Your team had the week to prepare.`);
  }
  applyWeeklyManagement(c);
  c.week++;
  reconcileHistoricalImports(c);
  if (c.week === 17) {
    const arrivals = heroesArrivingIn(c.year);
    if (arrivals.length) note(c, `${c.year} shuffle adds ${arrivals.length} heroes: ${arrivals.map((h) => h.name).join(", ")}.`);
  }
  if (c.week > 18) {
    c.year++;
    c.week = 1;
    c.points = 0;
    c.qualified = false;
    c.players.forEach((p) => {
      if (p.age != null) p.age++;
    });
    note(c, `${c.year} begins. A new season, a fresh chance at the Aegis.`);
    if (c.settings.shuffle)
      note(c, "New season ready. Players and heroes through 2026 enter during their annual shuffle; your alternate timeline continues beyond the imported years.");
  } else note(c, `Week ${c.week}: training and recovery completed. Payroll settled.`);
  for (const p of teamPlayers(c)) {
    const contract = c.contracts?.[p.id];
    if (contract && campaignWeek(c) === contract.expiresAt)
      note(c, `${p.name}'s fixed contract has ended. Terms continue week to week; renew to remove the weekly 2-point happiness penalty.`);
  }
  advanceSponsorMarket(c);
  return c;
}

function applyWeeklyManagement(c: Campaign) {
  transaction(c, "Weekly payroll", -weeklyWages(c));
  if (weeklyIncome(c)) transaction(c, "Sponsor income", weeklyIncome(c));
  c.reputation = roundTraining(c.reputation + sponsorBenefits(c).reputation);
  for (const p of teamPlayers(c)) {
    const plan = c.training[p.id] || "Balanced";
    const practice = weeklyPractice(c, p, plan);
    applyPlayerPractice(p, plan, practice, c.cash < 0);
  }
  developWorldPlayers(c);
}

/** Real elapsed time pays and trains once per seven days, across year changes.
 * A tournament can only move the clock through its own fixture progression. */
export function advanceCalendarTo(current: Campaign, at: string, tournamentProgress = false): Campaign {
  if (!current.calendar) return current;
  const target = Date.parse(at);
  if (!Number.isFinite(target) || target <= Date.parse(current.calendar.now)) return current;
  if (!tournamentProgress) {
    const next = current.calendar.runs.filter(r => r.state === "playing").map(r => nextTournamentFixture(r)).filter(f => !!f).map(f => utcTime(f!.at));
    if (next.length && target > Math.max(Date.parse(current.calendar.now), Math.min(...next))) return current;
  }
  if (target - Date.parse(current.calendar.now) > 366 * 86400000) throw new Error("Advance the calendar at most one year at a time.");
  const c = structuredClone(current);
  const calendar = c.calendar!;
  const updateDate = (atTime: number) => {
    calendar.now = new Date(atTime).toISOString();
    const year = new Date(atTime).getUTCFullYear();
    if (year > c.year) {
      for (const player of c.players) if (player.age != null) player.age += year - c.year;
      c.year = year;
    }
    c.week = Math.floor((atTime - Date.UTC(c.year, 0, 1)) / 604800000) + 1;
  };
  for (let tick = Date.parse(calendar.origin) + (calendar.paidWeeks + 1) * 604800000; tick <= target; tick += 604800000) {
    // Reconcile arrivals before the weekly tick, whether the manager advances
    // in one jump or stops between ticks. Newly available players train once.
    reconcileHistoricalImports(c, new Date(tick).toISOString());
    applyWeeklyManagement(c);
    calendar.paidWeeks++;
    updateDate(tick);
    reconcileHistoricalImports(c);
    advanceSponsorMarket(c);
  }
  updateDate(target);
  reconcileHistoricalImports(c);
  return c;
}

// Catch up historical saves made before the later batches existed. This changes
// only roster imports, never elapsed weeks, finances, results or manager choices.
function reconcileHistoricalImports(c: Campaign, at = c.calendar?.now) {
  if (!c.world) return;
  if (c.calendar?.runs.some(r => r.state === "playing")) return;
  if (c.calendar) for (let year = 2011; year <= Math.min(2026, new Date(at!).getUTCFullYear()); year++) {
    const ti = historicalTournaments.find(e => e.kind === "ti" && e.year === year);
    const after = ti ? utcTime(ti.end) + 86400000 : year === 2020 ? Date.UTC(2021, 0, 1) : Infinity;
    if (utcTime(at!) >= after && !c.calendar.shuffledYears.includes(year)) c.calendar.shuffledYears.push(year);
  }
  const through = c.calendar ? Math.max(2010, ...c.calendar.shuffledYears) : Math.min(2026, c.year - (c.week <= 16 ? 1 : 0));
  for (let year = 2011; year <= through; year++) {
    const shuffled = postTiShuffle(c.world, c.players, year, c.settings.shuffle);
    if (shuffled) {
      c.world = shuffled.state;
      c.players = shuffled.players;
      for (const p of c.players) c.training[p.id] ??= "Balanced";
      note(c, `${year} ${year === 2020 ? "annual shuffle (no historical TI)" : "post-TI shuffle"}: regional player arrivals imported.${c.settings.shuffle ? " Historical roster moves applied." : " Historical roster moves disabled."} Your starting five and recruitment decisions are retained.`);
      if (shuffled.unformedClubs.length) note(c, `${shuffled.unformedClubs.join(", ")} could not form a full regional roster in this timeline. Their available players remain in the market.`);
    }
  }
}
export function simulateEvent(
  current: Campaign,
  e: GameEvent,
  seed = Math.floor(Math.random() * 4294967296),
): Campaign {
  if (eventResult(current, e.id) || e.week < current.week) return current;
  if (e.kind === "ti" && !current.qualified) return current;
  const prepared = prepareEvent(current, e);
  return settleEvent(
    current,
    e,
    simulateBestOfThree(buildBattleConfig(prepared, e, seed)).summary,
  );
}
export function prepareEvent(current: Campaign, e: GameEvent): Campaign {
  let c = structuredClone(current);
  while (c.week < e.week) c = advanceWeek(c);
  return c;
}
export const opponentClub = (c: Campaign) => {
  const clubs = c.world ? activeClubs(c.world).filter((t) => t.id !== c.world!.managedTeamId && t.roster.length === 5) : undefined;
  return clubs?.length ? clubs[c.results.length % clubs.length] : undefined;
};
export const opponentFor = (c: Campaign) => opponentClub(c)?.name ??
  ["Cinder Collective", "Nova Assembly", "Silent Current", "Aster Union"][c.results.length % 4];
export const playerTeam = (c: Campaign, id: string) =>
  clubForPlayer(c.world, id)?.name ?? (c.roster.includes(id) ? c.settings.team : "Free agent");
export function recruitmentBlocker(c: Campaign, id: string): string | null {
  const outgoing = teamPlayers(c).find(p => p.role === c.players.find(v => v.id === id)?.role);
  const lock = playerTournamentLock(c, id) ?? (outgoing ? playerTournamentLock(c, outgoing.id) : null);
  if (lock) return lock;
  if (!c.world) return null;
  return recruitHistoricalPlayer(structuredClone(c.world), structuredClone(c.players), id);
}
export function buildBattleConfig(
  c: Campaign,
  e: GameEvent,
  seed = Math.floor(Math.random() * 4294967296),
): BattleConfig {
  const random = seededRandom(seed);
  const players = teamPlayers(c).map((p, role) => ({
    id: p.id,
    name: p.name,
    role,
    skills: { ...p.stats },
    energy: p.energy,
    happiness: p.happiness,
  }));
  const club = opponentClub(c);
  const opposition = club ? club.roster.map((id, role) => {
    const p = c.players.find((p) => p.id === id)!;
    return { id: p.id, name: p.name, role, skills: { ...p.stats }, energy: p.energy, happiness: p.happiness };
  }) : ROLES.map((_, role) => ({
    id: `opponent-${role}`,
    name: ["Cinder", "Echo", "Flare", "Rune", "Tern"][role],
    role,
    skills: Object.fromEntries(
      Object.keys(players[role].skills).map((key) => [
        key,
        clamp(e.level + (random() - 0.5) * 10),
      ]),
    ),
    energy: 90,
    happiness: 85,
  }));
  return {
    seed,
    year: c.year,
    heroPoolThroughYear: heroUnlockYear(c.year, c.week),
    teams: [c.settings.team, opponentFor(c)],
    players: [players, opposition],
    bonuses: [
      (c.settings.difficulty === "Club"
        ? 0.14
        : c.settings.difficulty === "Legend"
          ? -0.12
          : 0) + (c.staffIds.includes("c2") ? 0.035 : 0),
      0,
    ],
  };
}
export function settleEvent(
  current: Campaign,
  e: GameEvent,
  series: SeriesSummary,
): Campaign {
  if (
    eventResult(current, e.id) ||
    e.week < current.week ||
    (e.kind === "ti" && !current.qualified)
  )
    return current;
  if (
    series.teams[0] !== current.settings.team ||
    series.winner === null ||
    series.games.length < 2 ||
    series.games.length > 3 ||
    Math.max(...series.score) !== 2 ||
    series.score[series.winner] !== 2 ||
    series.games.filter((g) => g.winner === 0).length !== series.score[0] ||
    series.games.filter((g) => g.winner === 1).length !== series.score[1]
  )
    throw new Error("Invalid series result");
  let c = prepareEvent(current, e);
  const won = series.winner === 0;
  const points = won ? e.points : Math.floor(e.points * 0.25);
  const prize = won ? e.prize : Math.floor(e.prize * 0.12);
  c.points += points;
  c.reputation = clamp(c.reputation + (won ? 12 : 3));
  c.qualified ||= c.points >= 80 || (e.kind === "qualifier" && won);
  c.results.push({
    eventId: e.id,
    event: e.name,
    year: c.year,
    week: c.week,
    won,
    prize,
    points,
    opponent: series.teams[1],
    score: `${series.score[0]} – ${series.score[1]}`,
    series,
  });
  transaction(c, `${e.name} earnings`, prize);
  for (const p of teamPlayers(c)) {
    const share = Math.floor(prize * (c.contracts?.[p.id]?.prizeShare ?? 0) / 100);
    if (share) transaction(c, `${p.name} prize share · ${e.name}`, -share);
  }
  for (const p of teamPlayers(c)) {
    p.energy = clamp(p.energy - (e.kind === "ti" ? 25 : 15));
    p.happiness = clamp(p.happiness + (won ? 6 : -4));
    p.stats.confidence = clamp(p.stats.confidence + (won ? 4 : -3));
  }
  note(
    c,
    `${won ? "Victory" : "Defeat"} at ${e.name}. ${money(prize)} earned. ${points} circuit points.`,
  );
  c = advanceWeek(c);
  return c;
}
export function signPlayer(current: Campaign, id: string): Campaign {
  if (recruitmentBlocker(current, id)) return current;
  const c = structuredClone(current);
  const p = c.players.find((p) => p.id === id);
  if (!p || c.roster.includes(id) || c.cash < p.fee) return current;
  const slot = c.roster.findIndex(
    (pid) => c.players.find((player) => player.id === pid)?.role === p.role,
  );
  if (slot < 0) return current;
  const previousId = c.roster[slot];
  const severance = releaseCost(c, previousId);
  if (c.cash < p.fee + severance) return current;
  const owner = playerTeam(c, id);
  if (c.world) {
    const reason = recruitHistoricalPlayer(c.world, c.players, id);
    if (reason) return current;
    c.roster = [...c.world.clubs.find((t) => t.id === c.world!.managedTeamId)!.roster];
  } else c.roster[slot] = id;
  transaction(c, `${p.name} signing fee`, -p.fee);
  if (severance) transaction(c, `${c.players.find((v) => v.id === previousId)!.name} early release`, -severance);
  if (c.contracts?.[previousId]) {
    c.players.find((v) => v.id === previousId)!.wage = c.contracts[previousId].marketWage;
    delete c.contracts[previousId];
  }
  note(
    c,
    `${p.name} joins as ${p.role.toLowerCase()}. The previous starter leaves the lineup.${owner !== "Free agent" ? ` ${owner}'s lineup remains complete after regional recruitment.` : ""}`,
  );
  return c;
}
export function negotiateContract(current: Campaign, id: string, offer: ContractOffer): {
  campaign: Campaign; status: "accepted" | "counter" | "blocked" | "invalid"; message: string; counter?: ContractOffer;
} {
  const p = current.players.find((v) => v.id === id);
  if (!p) return { campaign: current, status: "invalid", message: "Player is unavailable." };
  const assessment = assessOffer(current, p, offer);
  if (assessment.status !== "accepted") return { campaign: current, ...assessment };
  const ownPlayer = current.roster.includes(id);
  const outgoing = ownPlayer ? undefined : teamPlayers(current).find((v) => v.role === p.role);
  const upfront = offer.bonus + (ownPlayer ? 0 : p.fee + (outgoing ? releaseCost(current, outgoing.id) : 0));
  if (upfront > 0 && current.cash < upfront) return { campaign: current, status: "blocked", message: `This deal needs ${money(upfront)} up front, including fees, bonus and any early release.` };
  const previous = current.contracts?.[id];
  if (previous?.signedAt === campaignWeek(current) && Object.keys(offer).every((key) => previous[key as keyof ContractOffer] === offer[key as keyof ContractOffer]))
    return { campaign: current, status: "blocked", message: "These terms were already signed this week." };
  let c = ownPlayer ? structuredClone(current) : signPlayer(current, id);
  if (c === current) return { campaign: current, status: "blocked", message: recruitmentBlocker(current, id) ?? "No matching position is available." };
  const player = c.players.find((v) => v.id === id)!;
  c.contracts ??= {};
  c.contracts[id] = { ...offer, signedAt: campaignWeek(c), expiresAt: campaignWeek(c) + offer.weeks, marketWage: previous?.marketWage ?? p.wage };
  player.wage = offer.wage;
  if (offer.bonus) transaction(c, `${player.name} contract bonus`, -offer.bonus);
  note(c, `${player.name} agreed to ${offer.weeks} weeks at ${money(offer.wage)}/week, ${offer.practiceHours} practice hours, ${offer.restDays} protected rest days/week and ${offer.prizeShare}% of team prize earnings.`);
  return { campaign: c, status: "accepted", message: `${player.name} signed. The agreed terms are now active.` };
}
export function signSponsor(current: Campaign, id: string): Campaign {
  const c = structuredClone(current);
  const s = data.sponsors.find((s) => s.id === id);
  if (!s || c.sponsorIds.includes(id) || c.reputation < s.requirement || sponsorSlotsUsed(c) >= 5)
    return current;
  c.sponsorIds.push(id);
  transaction(c, `${s.name} signing bonus`, s.bonus);
  note(
    c,
    `${s.name} partnership signed. ${money(s.weekly)} in weekly support.`,
  );
  return c;
}
export function hireStaff(current: Campaign, id: string): Campaign {
  const c = structuredClone(current);
  const s = data.staff.find((s) => s.id === id);
  if (!s || c.staffIds.includes(id) || c.cash < s.weekly * 4) return current;
  c.staffIds.push(id);
  note(c, `${s.name} joins as ${s.role.toLowerCase()}.`);
  return c;
}
export const SAVE_KEY = "aegis-manager-campaign-v1";
export function readSave(): Campaign | null {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    if (!value) return null;
    const c = JSON.parse(value);
    if (
      c.version !== 1 ||
      !c.settings ||
      !Array.isArray(c.players) ||
      !Array.isArray(c.roster) ||
      !Array.isArray(c.results) ||
      !Array.isArray(c.transactions) ||
      !Array.isArray(c.log) ||
      !Array.isArray(c.staffIds) ||
      !Array.isArray(c.sponsorIds) ||
      !c.training ||
      !Number.isFinite(c.cash) ||
      !Number.isFinite(c.week) ||
      !Number.isFinite(c.year) ||
      c.roster.length !== 5 ||
      !c.roster.every((id: string) =>
        c.players.some((p: Player) => p.id === id && p.stats),
      )
    )
      return null;
    if (c.settings.branding) c.settings.branding = normalizeBranding(c.settings.branding);
    reconcileHistoricalImports(c);
    c.sponsorships ??= initialSponsorships(c);
    return c;
  } catch {
    return null;
  }
}
