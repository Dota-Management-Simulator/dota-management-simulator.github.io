import catalog from "./data/player-portraits.json";

export const playerPortraits = catalog.players;
export type PlayerPortrait = (typeof playerPortraits)[keyof typeof playerPortraits];

// Match stable historical IDs only. Similar handles and legacy fictional players
// must never inherit a real person's photograph.
export function portraitFor(playerId?: string): PlayerPortrait | undefined {
  return playerId && Object.hasOwn(playerPortraits, playerId)
    ? playerPortraits[playerId as keyof typeof playerPortraits]
    : undefined;
}
