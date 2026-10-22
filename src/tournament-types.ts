import type { GameSummary, SeriesSummary } from "./battle";

/** AI matches retain career statistics without resource timelines or replays. */
export interface TournamentPerformance {
  teams: SeriesSummary["teams"];
  games: Pick<GameSummary, "winner" | "duration" | "kills" | "players">[];
}

export type TournamentSlot =
  | { team: string }
  | { rank: number; group: string }
  | { match: string; outcome: "winner" | "loser" };
export interface TournamentFixture {
  id: string;
  stage: string;
  label: string;
  at: string;
  timeVerified: boolean;
  /** False means the playable date is an estimate within the event window. */
  dateVerified?: boolean;
  bestOf: 1 | 2 | 3 | 5 | 7;
  advantage?: [number, number];
  slots: [TournamentSlot, TournamentSlot];
  group?: string;
}
export interface TournamentGroup {
  id: string; name: string; teams: TournamentSlot[];
  mode: "round-robin" | "swiss";
  games: 1 | 2 | 3; legs: number;
  start?: string; end?: string;
  scoring?: Record<string, number>;
  tieBreak?: { boundaries: number[]; lowerSeedWins?: boolean; coinToss?: boolean; twoTeamBestOf?: 1 | 3; policy?: "ti2024" };
}
export interface TournamentPrize {
  from: number; to: number; usd: number; points?: number;
  nativeAmount?: number;
}
export interface HistoricalTournament {
  id: string; name: string; year: number; tier: number;
  start: string; end: string; location: string;
  online?: boolean;
  pool: number; prizes: TournamentPrize[];
  nativePool?: { currency: string; amount: number }; poolNote?: string;
  source: string; reviewedOn: string; format: string;
  additionalSources?: string[];
  teams: string[]; invited: string[];
  teamNames: Record<string, string>;
  kind: "ti" | "event" | "qualifier";
  parent?: string; region?: string; qualifyingPlaces?: number;
  /** A league or qualifier may award places in more than one later event. */
  qualification?: { eventId: string; from: number; to: number; slots?: string[] }[];
  groups: TournamentGroup[];
  fixtures: TournamentFixture[];
  placements: { slot: TournamentSlot; from: number; to: number }[];
  /** Source finishing bands, used as soft strength evidence, never as winners. */
  historicalResults?: Record<string, { from: number; to: number }>;
  status: "ready" | "needs-review" | "scheduled";
  limitations: string[];
}
export interface TournamentTeam {
  id: string; name: string; clubId?: string; roster: string[];
  /** Pinned evidence for this actual registered lineup, independent of its slot. */
  strength?: HistoricalStrength;
}
export interface HistoricalStrength {
  players: number;
  continuity: number;
  retained: number;
  covered: number;
  reference?: { event: string; source: string; from: number; to: number; rosterDate: string };
}
export interface TournamentMatchResult {
  id: string; teams: [string, string]; score: [number, number];
  winner: 0 | 1 | null; at: string; series?: SeriesSummary;
  performance?: TournamentPerformance;
}
export interface TournamentRun {
  eventId: string; seed: number; managed: string;
  teams: TournamentTeam[]; lineup: string[];
  prizeShares: Record<string, number>;
  matches: TournamentMatchResult[];
  fixtures: TournamentFixture[];
  groupOrder: Record<string, string[]>;
  state: "playing" | "complete";
  placements: { team: string; from: number; to: number; prize: number; points: number }[];
  settled?: boolean;
  /** Structural rules are pinned at registration, not player combat configs. */
  definition?: Omit<HistoricalTournament, "fixtures">;
}
export interface HistoricalCalendar {
  now: string;
  origin: string;
  paidWeeks: number;
  contractEpoch: number;
  runs: TournamentRun[];
  rankings: Record<string, number>;
  invitations: Record<string, string[]>;
  shuffledYears: number[];
  nowHasTime?: boolean;
}
