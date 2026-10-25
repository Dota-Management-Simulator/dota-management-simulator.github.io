import type { SeasonPatch } from "./patches";

export type MenuPromotion = [patch: string, file: string, title: string, released?: string, until?: string];
const order = (id: string) => { const [year, phase] = id.split(".").map(Number); return year * 2 + phase; };

/** A dated client follows actual releases/expiry; weekly saves keep composites. */
export function selectMenuPromotion(entries: MenuPromotion[], patch: Pick<SeasonPatch, "year" | "phase">, day?: string) {
  return [...entries].reverse().find(([id, , , released, until]) => day && released
    ? released <= day && (!until || day <= until)
    : order(id) <= patch.year * 2 + patch.phase) ?? entries[0];
}
