import { useState } from "react";
import { teamInitials, teamLogoFor } from "./team-logos";
import type { ClubBranding } from "./branding";
import { ClubCrest, useClubBranding } from "./ClubIdentity";

export default function TeamBadge({ teamId, name, year, size = "medium", branding }: {
  teamId?: string; name: string; year: number; size?: "small" | "medium" | "large";
  branding?: ClubBranding;
}) {
  const managedBranding = useClubBranding(teamId, name);
  const identity = branding ?? managedBranding;
  const custom = identity?.logo;
  const logo = teamLogoFor(teamId, year);
  const [failedPath, setFailedPath] = useState<string>();
  const available = logo && failedPath !== logo.path;
  const uploaded = custom?.kind === "upload" && failedPath !== custom.dataUrl;
  if (custom?.kind === "crest" || uploaded) return <span className={`team-badge team-badge-${size} team-badge-custom`} role="img"
    aria-label={`${name} custom logo`} title={`${name} · Custom club logo`}>
    {custom.kind === "crest" ? <ClubCrest logo={custom} primary={identity!.primary} secondary={identity!.secondary} /> :
      <img src={custom.dataUrl} alt="" decoding="async" onError={() => setFailedPath(custom.dataUrl)} />}
  </span>;
  return <span className={`team-badge team-badge-${size}`} role="img"
    aria-label={available ? `${name} logo, ${logo.year} reference` : `${name} initials`}
    title={available ? `${name} · ${logo.year} logo reference` : `${name} · ${teamId === "managed-custom" ? "Custom club" : "Historical logo unavailable for this era"}`}>
    {available ? <img src={`${import.meta.env.BASE_URL}${logo.path}`} alt="" decoding="async"
      onError={() => setFailedPath(logo.path)} /> : <span className="team-badge-initials">{teamInitials(name)}</span>}
  </span>;
}
