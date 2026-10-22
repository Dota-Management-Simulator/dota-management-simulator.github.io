import { useState } from "react";
import type { Player } from "./game";
import { portraitFor } from "./player-portraits";

export default function PlayerAvatar({ player, small = false }: { player: Pick<Player, "id" | "name" | "color">; small?: boolean }) {
  const photo = portraitFor(player.id);
  const [failedPath, setFailedPath] = useState<string>();
  const available = photo && photo.path !== failedPath;
  return <div className={`avatar ${player.color} ${small ? "small" : ""} ${available ? "has-photo" : ""}`}
    role="img" aria-label={available ? `${player.name} portrait` : `${player.name} placeholder portrait`}>
    {available ? <img src={`${import.meta.env.BASE_URL}${photo.path}`} alt="" loading="lazy" decoding="async"
      onError={() => setFailedPath(photo.path)} /> : <><span>{player.name.slice(0, 1)}</span><div className="avatar-shape" /></>}
  </div>;
}

export function PortraitCredit({ playerId }: { playerId: string }) {
  const photo = portraitFor(playerId);
  if (!photo) return null;
  const date = photo.photoDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? photo.photoDate;
  return <p className="portrait-credit">Photo: <a className="text-link" href={photo.filePage} target="_blank" rel="noreferrer">{photo.author} ↗</a>
    {" · "}<a className="text-link" href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>
    {" · "}{date}. Cropped and resized. Portraits are not season-specific.</p>;
}
