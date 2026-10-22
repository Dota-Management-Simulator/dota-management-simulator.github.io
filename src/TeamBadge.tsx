import { useState } from "react";
import { teamInitials, teamLogoFor } from "./team-logos";

export default function TeamBadge({ teamId, name, year, size = "medium" }: {
  teamId?: string; name: string; year: number; size?: "small" | "medium" | "large";
}) {
  const logo = teamLogoFor(teamId, year);
  const [failedPath, setFailedPath] = useState<string>();
  const available = logo && failedPath !== logo.path;
  return <span className={`team-badge team-badge-${size}`} role="img"
    aria-label={available ? `${name} logo, ${logo.year} reference` : `${name} initials`}
    title={available ? `${name} · ${logo.year} logo reference` : `${name} · ${teamId === "managed-custom" ? "Custom club" : "Historical logo unavailable for this era"}`}>
    {available ? <img src={`${import.meta.env.BASE_URL}${logo.path}`} alt="" decoding="async"
      onError={() => setFailedPath(logo.path)} /> : <span className="team-badge-initials">{teamInitials(name)}</span>}
  </span>;
}
