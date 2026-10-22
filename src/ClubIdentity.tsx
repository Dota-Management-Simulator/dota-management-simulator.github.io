import { createContext, useContext } from "react";
import type { ClubBranding, ClubLogo } from "./branding";
import { readableText } from "./branding";

export const ClubIdentityContext = createContext<{ teamId?: string; name: string; branding: ClubBranding } | null>(null);
export function useClubBranding(teamId: string | undefined, name: string) {
  const identity = useContext(ClubIdentityContext);
  return identity && (identity.teamId ? teamId === identity.teamId : !teamId && name === identity.name) ? identity.branding : undefined;
}
export function ClubCrest({ logo, primary, secondary }: { logo: Extract<ClubLogo, { kind: "crest" }>; primary: string; secondary: string }) {
  return <svg viewBox="0 0 100 110" aria-hidden="true" className="club-crest">
    {logo.shape === "shield" ? <path d="M8 7H92V51Q92 82 50 103Q8 82 8 51Z" fill={primary} stroke={secondary} strokeWidth="5" /> :
      logo.shape === "round" ? <ellipse cx="50" cy="55" rx="45" ry="49" fill={primary} stroke={secondary} strokeWidth="5" /> :
        <path d="M50 5L95 55L50 105L5 55Z" fill={primary} stroke={secondary} strokeWidth="5" />}
    <g fill={secondary} stroke={readableText(primary)} strokeWidth=".7">
      {logo.symbol === "star" ? <path d="M50 20L57 37L75 38L61 50L65 68L50 58L35 68L39 50L25 38L43 37Z" /> :
        logo.symbol === "bolt" ? <path d="M56 17L30 49H46L40 70L71 36H53Z" /> :
          <path d="M25 31L39 43L50 23L61 43L75 31L68 61H32Z" />}
    </g>
    <text x="50" y="86" textAnchor="middle" fill={readableText(primary)} fontSize="17" fontWeight="800" fontFamily="Manrope, sans-serif">{logo.text}</text>
  </svg>;
}
