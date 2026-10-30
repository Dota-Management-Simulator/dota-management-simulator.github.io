/** Skills describe a controller, never a different hero kit. Versioned so
 * already-prepared maps can retain their original numerical execution rules. */
export const PLAYER_CONTROL_VERSION = 'decisions-v1';
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export function controllerRoll(seed: number, id: string, window: number, purpose: string) {
  let n = (seed ^ window) >>> 0;
  for (const ch of `${id}:${purpose}`) n = Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0;
  n ^= n >>> 16; n = Math.imul(n, 2246822507); n ^= n >>> 13;
  return (n >>> 0) / 4294967296;
}
export function reactionSeconds(skill: number, stability: number, energy: number, happiness: number, roll: number) {
  const fatigue = (100 - clamp(energy, 0, 100)) / 100;
  const morale = (100 - clamp(happiness, 0, 100)) / 100;
  const variation = (roll - .5) * (1 - clamp(stability, 0, 99) / 110) * 1.2;
  return Math.max(1.2, 4.8 - clamp(skill, 0, 99) * .032 + fatigue * 1.2 + morale * .6 + variation);
}
export function decisionProbability(skill: number) { return .35 + clamp(skill, 0, 99) / 165; }
