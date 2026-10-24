import type { Campaign } from "./game";
import type { BattleConfig, SeriesSummary } from "./battle";

export const scrimFocuses = {
  balanced: { name: "Try ideas", stats: ["creativity", "heroPool"] },
  lanes: { name: "Lane practice", stats: ["laning", "farming"] },
  teamfight: { name: "Teamfight execution", stats: ["teamfights", "stability"] },
  objectives: { name: "Map & objectives", stats: ["vision", "intuition", "pushing"] },
} as const;
export type ScrimFocus = keyof typeof scrimFocuses;
export interface Scrim {
  id: string;
  opponentId: string;
  opponent: string;
  at: string;
  bestOf: 1 | 2 | 3;
  focus: ScrimFocus;
  source: "manager" | "request";
  status: "requested" | "scheduled" | "complete" | "declined" | "cancelled" | "expired";
  seed: number;
  config?: BattleConfig;
  series?: SeriesSummary;
  review?: { players: { id: string; name: string; confidence: number; training: number; energy: number }[]; heroes: string[] };
}
export interface ScrimState {
  sessions: Scrim[];
  requestWeek?: number;
  research: Record<string, Record<string, number>>;
}
export const scrimHours = (bestOf: number) => bestOf * 1.5 + 0.5;
export const nextScrim = (c: Campaign) => c.scrims?.sessions.filter(s => s.status === "scheduled")
  .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];

/** Optional metadata must never invalidate an otherwise valid old campaign. */
export function normalizeScrims(value: unknown): ScrimState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const v = value as Partial<ScrimState>;
  const sessions = Array.isArray(v.sessions) ? v.sessions.filter(s => s && typeof s.id === "string" && typeof s.opponentId === "string" && typeof s.opponent === "string" && Number.isFinite(Date.parse(s.at)) && [1, 2, 3].includes(s.bestOf) && Object.hasOwn(scrimFocuses, s.focus) && ["manager", "request"].includes(s.source) && ["requested", "scheduled", "complete", "declined", "cancelled", "expired"].includes(s.status) && Number.isFinite(s.seed)) : [];
  const research: ScrimState["research"] = {};
  if (v.research && typeof v.research === "object" && !Array.isArray(v.research)) {
    for (const [patch, rows] of Object.entries(v.research)) if (rows && typeof rows === "object" && !Array.isArray(rows)) {
      research[patch] = Object.fromEntries(Object.entries(rows).filter(([, n]) => Number.isFinite(n) && n > 0).map(([id, n]) => [id, Math.min(200, Math.floor(n))]));
    }
  }
  return { sessions: [...new Map(sessions.map(s => [s.id, { ...s, config: undefined }])).values()], research,
    ...(Number.isFinite(v.requestWeek) ? { requestWeek: v.requestWeek } : {}) };
}
