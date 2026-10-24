import { teamInitials } from "./team-logos";
import data from "./data/sponsor-logos.json";

export interface SponsorLogo { title: string; slug: string; hex: string; path: string; parent?: string; source?: string }
const logos: Record<string, SponsorLogo> = data.logos;

export const sponsorLogoFor = (id: string): SponsorLogo | undefined => logos[id];

// Very light brand colors would vanish on the light badge tile.
function markColor(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.7 ? "#314b3f" : `#${hex}`;
}

/** Sponsor mark on the same light tile as team badges, sized like small player portraits. */
export default function SponsorBadge({ id, name }: { id: string; name: string }) {
  const logo = sponsorLogoFor(id);
  return <span className="team-badge team-badge-small sponsor-badge" role="img"
    aria-label={logo ? `${name} logo${logo.parent ? ` (${logo.parent} parent brand)` : ""}` : `${name} initials`}
    title={logo ? `${name}${logo.parent ? ` · ${logo.parent} parent-brand mark` : ""}` : `${name} · Logo unavailable`}>
    {logo ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d={logo.path} fill={markColor(logo.hex)} /></svg>
      : <span className="team-badge-initials">{teamInitials(name)}</span>}
  </span>;
}
