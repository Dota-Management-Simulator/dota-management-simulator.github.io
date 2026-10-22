import catalog from "./data/player-portrait-index.json";

export interface PlayerPortrait {
  path: string;
  filePage: string;
  author: string;
  license: string;
  licenseUrl?: string;
  photoDate: string;
}

export const playerPortraits: Record<string, PlayerPortrait> = catalog.players;

// Match stable historical IDs only. Similar handles and legacy fictional players
// must never inherit a real person's photograph.
export function portraitFor(playerId?: string): PlayerPortrait | undefined {
  return playerId && Object.hasOwn(playerPortraits, playerId)
    ? playerPortraits[playerId]
    : undefined;
}
