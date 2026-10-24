import { formatDate } from "./tournaments";

/** Weekly saves retain labels such as "2011 · Week 4", including after adopting a calendar. */
export function formatOfficeDate(at: string): string {
  return Number.isFinite(Date.parse(at)) ? formatDate(at) : at;
}
