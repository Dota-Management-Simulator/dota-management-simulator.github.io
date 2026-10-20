import world from "./data/world.json";
import { simulateBestOfThree, seededRandom } from "./battle";
import type { BattleConfig, SeriesSummary } from "./battle";

export const ROLES = [
  "Carry",
  "Mid",
  "Offlane",
  "Soft support",
  "Hard support",
] as const;
export type Role = (typeof ROLES)[number];
export type Difficulty = "Club" | "Contender" | "Legend";
export type Training =
  | "Balanced"
  | "Laning"
  | "Teamfights"
  | "Map awareness"
  | "Hero pool"
  | "Rest";
export type Player = (typeof world.players)[number];
export type Page =
  | "overview"
  | "roster"
  | "training"
  | "calendar"
  | "patch"
  | "scouting"
  | "staff"
  | "finances"
  | "history";
export interface Settings {
  team: string;
  region: string;
  difficulty: Difficulty;
  year: number;
  shuffle: boolean;
  injuries: boolean;
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
  sponsorIds: string[];
  staffIds: string[];
  results: Result[];
  log: string[];
  transactions: { week: number; year: number; label: string; amount: number }[];
}
export const DEFAULT_SETTINGS: Settings = {
  team: "Atlas Esports",
  region: "Europe",
  difficulty: "Contender",
  year: 2011,
  shuffle: true,
  injuries: false,
};
export const data = world;
export const statNames: Record<string, string> = {
  creativity: "Creativity",
  stability: "Stability",
  confidence: "Confidence",
  stamina: "Stamina",
  heroPool: "Hero pool",
  laning: "Laning",
  teamfights: "Teamfights",
  farming: "Farming",
  skirmish: "Skirmish",
  vision: "Vision",
  intuition: "Intuition",
  pushing: "Pushing",
};
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
export const weeklyIncome = (c: Campaign) =>
  data.sponsors
    .filter((s) => c.sponsorIds.includes(s.id))
    .reduce((s, p) => s + p.weekly, 0);
export const eventResult = (c: Campaign, id: string) =>
  c.results.find((r) => r.year === c.year && r.eventId === id);
export const nextEvent = (c: Campaign) =>
  events.find((e) => e.week >= c.week && !eventResult(c, e.id));
export const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));
export function createCampaign(settings: Settings): Campaign {
  return {
    version: 1,
    settings: { ...settings, team: settings.team.trim() || "Atlas Esports" },
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
    players: structuredClone(data.players),
    roster: data.players.slice(0, 5).map((p) => p.id),
    training: Object.fromEntries(data.players.map((p) => [p.id, "Balanced"])),
    sponsorIds: [],
    staffIds: [],
    results: [],
    log: ["Welcome to your first season. Your story starts here."],
    transactions: [],
  };
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
  const c = structuredClone(current);
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
  transaction(c, "Weekly payroll", -weeklyWages(c));
  if (weeklyIncome(c)) transaction(c, "Sponsor income", weeklyIncome(c));
  const coach = c.staffIds.includes("c1") ? 1 : 0;
  const therapist = c.staffIds.includes("c3") ? 8 : 0;
  for (const p of teamPlayers(c)) {
    const plan = c.training[p.id] || "Balanced";
    const keys =
      plan === "Laning"
        ? ["laning", "skirmish"]
        : plan === "Teamfights"
          ? ["teamfights", "stability"]
          : plan === "Map awareness"
            ? ["vision", "intuition", "pushing"]
            : plan === "Hero pool"
              ? ["heroPool", "creativity"]
              : ["stability", "stamina"];
    if (plan !== "Rest")
      for (const key of keys)
        p.stats[key as keyof Player["stats"]] = clamp(
          p.stats[key as keyof Player["stats"]] + 1 + coach,
          0,
          99,
        );
    p.energy = clamp(
      p.energy +
        (plan === "Rest" ? 24 : plan === "Balanced" ? 7 : -5) +
        therapist,
    );
    p.happiness = clamp(
      p.happiness + (c.cash < 0 ? -10 : plan === "Rest" ? 4 : 1),
    );
  }
  c.week++;
  if (c.week > 18) {
    c.year++;
    c.week = 1;
    c.points = 0;
    c.qualified = false;
    c.players.forEach((p) => {
      p.age++;
    });
    note(c, `${c.year} begins. A new season, a fresh chance at the Aegis.`);
    if (c.settings.shuffle)
      note(
        c,
        "Shuffle window open. Review free agents and refresh your roster.",
      );
  } else
    note(
      c,
      `Week ${c.week}: training and recovery completed. Payroll settled.`,
    );
  return c;
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
export const opponentFor = (c: Campaign) =>
  ["Cinder Collective", "Nova Assembly", "Silent Current", "Aster Union"][
    c.results.length % 4
  ];
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
  const opposition = ROLES.map((_, role) => ({
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
  const c = structuredClone(current);
  const p = c.players.find((p) => p.id === id);
  if (!p || c.roster.includes(id) || c.cash < p.fee) return current;
  const slot = c.roster.findIndex(
    (pid) => c.players.find((player) => player.id === pid)?.role === p.role,
  );
  if (slot < 0) return current;
  c.roster[slot] = id;
  transaction(c, `${p.name} signing fee`, -p.fee);
  note(
    c,
    `${p.name} joins as ${p.role.toLowerCase()}. The previous starter is available as a free agent.`,
  );
  return c;
}
export function signSponsor(current: Campaign, id: string): Campaign {
  const c = structuredClone(current);
  const s = data.sponsors.find((s) => s.id === id);
  if (!s || c.sponsorIds.includes(id) || c.reputation < s.requirement)
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
    return c;
  } catch {
    return null;
  }
}
