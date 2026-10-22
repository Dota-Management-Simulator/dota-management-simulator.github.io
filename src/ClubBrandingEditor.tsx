import { useEffect, useRef, useState } from "react";
import type { ClubBranding, CrestShape, CrestSymbol } from "./branding";
import { normalizeBranding } from "./branding";
import { importClubLogo } from "./branding-images";
import { teamInitials } from "./team-logos";
import TeamBadge from "./TeamBadge";

export default function ClubBrandingEditor({ value, onChange, name, teamId, year }: {
  value: ClubBranding; onChange: (value: ClubBranding) => void; name: string; teamId?: string; year: number;
}) {
  const branding = normalizeBranding(value);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const crest = branding.logo?.kind === "crest" ? branding.logo : {
    kind: "crest" as const, shape: "shield" as const, symbol: "star" as const, text: teamInitials(name),
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const request = ++generation.current; setBusy(true); setError(""); setNotice("");
    try {
      const result = await importClubLogo(file);
      if (generation.current !== request) return;
      onChange({ ...branding, ...result.palette, logo: { kind: "upload", dataUrl: result.dataUrl } });
      setNotice(result.palette ? "Logo added. Team colors were picked from your image; you can adjust them below." : "Logo added. Choose your team colors below.");
    } catch (e) { if (generation.current === request) setError(e instanceof Error ? e.message : "The image could not be opened."); }
    finally { if (generation.current === request) setBusy(false); }
  };
  return <section className="club-branding-editor" aria-label="Team identity">
    <div className="club-branding-heading"><div><h3>Team identity</h3><p>Your badge. Your colors.</p></div>
      <TeamBadge teamId={teamId} name={name} year={year} branding={branding} size="large" />
    </div>
    <fieldset disabled={busy}>
      <legend className="sr-only">Logo and team colors</legend>
      <label className="club-upload">Upload a logo<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload team logo" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void upload(file); }} /></label>
      <p className="field-note">PNG, JPEG or WebP · up to 5 MB. Kept in this browser with your campaign.</p>
      <div className="club-logo-actions"><button type="button" className="button secondary" onClick={() => { onChange({ ...branding, logo: crest }); setNotice("Crest selected. Adjust its shape, symbol and initials below."); }}>Create a crest</button>
        {branding.logo && <button type="button" className="text-link" onClick={() => { const { logo: _logo, ...rest } = branding; onChange(rest); setNotice("Custom logo removed."); }}>Remove custom logo</button>}
      </div>
      {branding.logo?.kind === "crest" && <div className="club-crest-controls">
        <label>Shape<select value={crest.shape} onChange={e => onChange({ ...branding, logo: { ...crest, shape: e.target.value as CrestShape } })}><option value="shield">Shield</option><option value="round">Round</option><option value="diamond">Diamond</option></select></label>
        <label>Symbol<select value={crest.symbol} onChange={e => onChange({ ...branding, logo: { ...crest, symbol: e.target.value as CrestSymbol } })}><option value="star">Star</option><option value="bolt">Lightning</option><option value="crown">Crown</option></select></label>
        <label>Initials<input maxLength={3} value={crest.text} onChange={e => onChange({ ...branding, logo: { ...crest, text: e.target.value.toUpperCase() } })} /></label>
      </div>}
      <div className="club-color-controls">
        <label><span className="club-color-label">Primary color</span><input type="color" aria-label="Primary color" value={branding.primary} onInput={e => onChange({ ...branding, primary: e.currentTarget.value })} onChange={e => onChange({ ...branding, primary: e.target.value })} /><span>{branding.primary.toUpperCase()}</span></label>
        <label><span className="club-color-label">Secondary color</span><input type="color" aria-label="Secondary color" value={branding.secondary} onInput={e => onChange({ ...branding, secondary: e.currentTarget.value })} onChange={e => onChange({ ...branding, secondary: e.target.value })} /><span>{branding.secondary.toUpperCase()}</span></label>
      </div>
      <label className="club-theme-toggle"><input type="checkbox" checked={branding.useTeamColors} onChange={e => onChange({ ...branding, useTeamColors: e.target.checked })} /><span>Use team colors<small>Theme the app with your club’s colors. Turn off to use the original Aegis theme.</small></span></label>
    </fieldset>
    {busy && <p role="status">Preparing your logo…</p>}
    {notice && <p role="status" className="field-note">{notice}</p>}
    {error && <p role="alert" className="club-upload-error">{error}</p>}
  </section>;
}
