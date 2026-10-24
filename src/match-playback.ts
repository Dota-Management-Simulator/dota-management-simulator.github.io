import type { ReplayFrame } from "./battle";

/** Find adjacent recorded frames without scanning the replay from its start. */
export function replayWindow(frames: ReplayFrame[], clock: number) {
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (frames[mid].time < clock) lo = mid + 1;
    else hi = mid;
  }
  const after = frames[lo], before = frames[Math.max(0, lo - 1)];
  if (clock >= after.time) return { before: after, after, ratio: 0 };
  const ratio = after.time === before.time ? 0 : Math.max(0, (clock - before.time) / (after.time - before.time));
  return { before, after, ratio };
}

/** Both viewers use the same rate. Every advance is an integral engine tick. */
export function liveCadence(speed: number) {
  return { intervalMs: Math.max(100, 200 / speed), seconds: 6 * Math.max(1, speed / 2) };
}

type Position = { x: number; y: number; hp: number };
export function replayPosition(unit: Position, next: Position | undefined, ratio: number) {
  // Death/respawn is a teleport, never a flight across the map.
  const interpolate = next && (unit.hp <= 0) === (next.hp <= 0);
  return {
    x: unit.x + (interpolate ? next.x - unit.x : 0) * ratio,
    y: unit.y + (interpolate ? next.y - unit.y : 0) * ratio,
  };
}
