import catalog from "./data/team-logos.json";

export interface TeamLogo {
  year: number;
  name: string;
  path: string;
  source: string;
  imageUrl: string;
  filePage: string;
}
interface LogoClub { names: string[]; firstYear: number; versions: TeamLogo[]; status: string }
export const teamLogoCatalog: Record<string, LogoClub> = catalog.teams;
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Name resolution is for historical opponents only. Custom clubs use their own ID. */
export function teamIdForName(name: string, year: number) {
  const clubs = Object.entries(teamLogoCatalog).filter(([, club]) => club.firstYear <= year);
  const exact = clubs.filter(([, club]) => club.names.some((n) => n.toLowerCase() === name.toLowerCase()));
  const candidates = exact.length ? exact : clubs.filter(([, club]) => club.names.some((n) => normalize(n) === normalize(name)));
  return candidates.sort((a, b) => b[1].firstYear - a[1].firstYear)[0]?.[0];
}

/** Annual observations never borrow a future logo for an earlier season. */
export function teamLogoFor(teamId: string | undefined, year: number): TeamLogo | undefined {
  if (!teamId || !Number.isFinite(year)) return undefined;
  return teamLogoCatalog[teamId]?.versions.filter((v) => v.year <= year).at(-1);
}

export function teamInitials(name: string) {
  return name.trim().split(/\s+/).map((word) => Array.from(word)[0] ?? "").slice(0, 3).join("").toUpperCase() || "?";
}
