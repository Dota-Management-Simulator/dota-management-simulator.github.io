import { useEffect, useState } from "react";
import type { ClubBranding } from "./branding";
import { normalizeBranding, teamTheme } from "./branding";
import { colorsFromImage } from "./branding-images";
import { teamLogoFor } from "./team-logos";

export function useClubAppearance({ branding, teamId, year, custom, theme, enabled }: {
  branding?: ClubBranding; teamId?: string; year: number; custom: boolean; theme: "light" | "dark"; enabled: boolean;
}) {
  const logo = teamLogoFor(teamId, year);
  const path = !custom && !branding ? logo?.path : undefined;
  const [sample, setSample] = useState<{ path: string; colors: Pick<ClubBranding, "primary" | "secondary"> }>();
  useEffect(() => {
    if (!path) return;
    let active = true;
    void colorsFromImage(`${import.meta.env.BASE_URL}${path}`).then(colors => {
      if (active && colors) setSample({ path, colors });
    }).catch(() => { /* Missing artwork keeps the original theme. */ });
    return () => { active = false; };
  }, [path]);
  const automatic = path === sample?.path ? sample?.colors : undefined;
  const resolved = normalizeBranding(branding ?? automatic);
  const apply = enabled && resolved.useTeamColors && !!(branding || automatic || custom);
  useEffect(() => {
    if (!apply) return;
    const root = document.documentElement;
    const tokens = teamTheme(resolved, theme === "dark");
    root.dataset.clubTheme = "true";
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", tokens["--bg"]);
    return () => {
      delete root.dataset.clubTheme;
      Object.keys(tokens).forEach(key => root.style.removeProperty(key));
      meta?.setAttribute("content", theme === "dark" ? "#141a16" : "#f6f7f3");
    };
  }, [apply, resolved.primary, resolved.secondary, theme]);
  return resolved;
}
