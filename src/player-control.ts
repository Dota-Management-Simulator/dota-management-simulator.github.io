/** Skills describe a controller, never a different hero kit. Versioned so
 * already-prepared maps can retain their original numerical execution rules. */
export const PLAYER_CONTROL_VERSION = 'decisions-v2';
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
  return Math.max(.8, 5.6 - clamp(skill, 0, 99) * .048 + fatigue * 1.2 + morale * .6 + variation);
}
// Both curves keep their skill-50 values from decisions-v1 and widen around them.
export function decisionProbability(skill: number) { return clamp(.65 + (clamp(skill, 0, 99) - 50) * .0075, .2, .98); }
/** A player's read of a fight's strength ratio. The error shrinks with
 * judgement: about ×0.55–1.8 at 50 and within ±12% at 99. */
export function perceivedFightRatio(ratio: number, judgement: number, roll: number) {
  return ratio * Math.exp((roll - .5) * 2.2 * (1 - clamp(judgement, 0, 99) / 110));
}
