import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, FolderOpen, HardDrive, Play, Plus, Search, Shield, Trophy } from "lucide-react";
import { money } from "./game";
import { exportCampaign, importCampaign, readCampaignLibrary, saveCampaignSlot } from "./campaign-library";
import type { CampaignSlot } from "./campaign-library";
import { formatDate } from "./tournaments";
import TeamBadge from "./TeamBadge";
import "./campaign-launcher.css";
import AndroidAppBanner from "./AndroidAppBanner";
import type { Campaign } from './game';

function DotaMark() {
  return <span className="launcher-dota-mark" aria-hidden="true" />;
}
function campaignDate(slot: CampaignSlot) {
  return slot.campaign.calendar ? formatDate(slot.campaign.calendar.now) : `${slot.campaign.year} · Week ${slot.campaign.week}`;
}
function savedDate(slot: CampaignSlot) {
  return slot.savedAt ? new Date(slot.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Existing browser save";
}

export default function CampaignLauncher({ onLoad, onNew, initiallyOpen = false }: {
  onLoad: (slot: CampaignSlot) => void; onNew: () => void; initiallyOpen?: boolean;
}) {
  const [library, setLibrary] = useState(readCampaignLibrary);
  const [fileStatus, setFileStatus] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const [screen, setScreen] = useState<"library" | "launching" | "campaigns">(initiallyOpen ? "campaigns" : "library");
  const [selectedId, setSelectedId] = useState(library.slots[0]?.id);
  const [query, setQuery] = useState("");
  const filtered = library.slots.filter(slot => `${slot.campaign.settings.team} ${slot.campaign.year} ${slot.campaign.settings.year}`.toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find(slot => slot.id === selectedId) ?? filtered[0];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (screen !== "launching") { heading.current?.focus(); return; }
    const timer = window.setTimeout(() => setScreen("campaigns"), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 850);
    return () => window.clearTimeout(timer);
  }, [screen]);
  const latest = library.slots[0];
  const saveCopy = (campaign: Campaign, reason: string) => {
    const id = `import-${crypto.randomUUID()}`;
    saveCampaignSlot(id, campaign);
    setLibrary(readCampaignLibrary()); setSelectedId(id); setScreen('campaigns'); setQuery('');
    setFileStatus(`${reason} saved as a separate campaign. Select Load campaign to continue.`);
    return id;
  };
  const download = () => {
    if (!selected) return;
    const url = URL.createObjectURL(new Blob([exportCampaign(selected.campaign)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `aegis-${selected.campaign.settings.team.replace(/[^a-z0-9]+/gi, '-').slice(0, 50)}-${selected.campaign.year}.json`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFileStatus('Campaign exported. Keep this file somewhere safe.');
  };
  const badge = (slot: CampaignSlot) => <TeamBadge teamId={slot.campaign.world?.managedTeamId} name={slot.campaign.settings.team}
    year={slot.campaign.year} branding={slot.campaign.settings.branding} />;

  if (screen === "launching") return <main className="campaign-boot" aria-live="polite" aria-busy="true">
    <DotaMark /><h1> DOTA 2 </h1><p>AEGIS MANAGER</p><span className="boot-progress" /><span>Launching campaign manager…</span>
    <button onClick={() => setScreen("library")}>Cancel launch</button>
  </main>;

  return <div className={`campaign-launcher ${screen === "campaigns" ? "show-campaigns" : ""}`}>
    <header className="launcher-topbar">
      <button className="launcher-brand" onClick={() => setScreen("library")} aria-label="Return to library"><img src={`${import.meta.env.BASE_URL}launcher/steam-logo.svg`} alt="Steam" /><span className="launcher-edition">AEGIS EDITION</span></button>
      <nav aria-label="Launcher"><button className={screen === "library" ? "active" : ""} onClick={() => setScreen("library")}>LIBRARY</button><button className={screen === "campaigns" ? "active" : ""} onClick={() => setScreen("campaigns")}>CAMPAIGNS</button></nav>
      <span className="launcher-local"><HardDrive size={14} /> Local library</span>
    </header>
    <AndroidAppBanner />
    <div className="launcher-file-controls"><button disabled={fileBusy} onClick={() => importInput.current?.click()}>{fileBusy ? 'Reading campaign…' : 'Import campaign'}</button><input ref={importInput} type="file" accept=".json,application/json" aria-label="Import campaign file" hidden onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      setFileBusy(true);
      try { if (file.size > 32_000_000) throw new Error('Campaign file is too large (32 MB maximum).'); saveCopy(importCampaign(await file.text()), 'Imported campaign'); }
      catch (error) { setFileStatus(error instanceof Error ? error.message : 'Could not import campaign. Existing campaigns are preserved.'); }
      finally { setFileBusy(false); }
    }} />{fileStatus && <p role="status">{fileStatus}</p>}</div>
    {screen === "library" ? <div className="launcher-library">
      <aside className="launcher-sidebar">
        <span className="launcher-sidebar-label">YOUR LIBRARY <span>1</span></span>
        <button className="launcher-game-selected" onClick={() => setScreen("library")}><DotaMark /><span>Dota 2<small>Aegis Manager</small></span></button>
        <div className="launcher-sidebar-rule" /><span className="launcher-sidebar-label">YOUR CAMPAIGNS <span>{library.slots.length}</span></span>
        {library.slots.slice(0, 5).map(slot => <button className="launcher-sidebar-save" key={slot.id} onClick={() => { setSelectedId(slot.id); setScreen("campaigns"); }}>{badge(slot)}<span>{slot.campaign.settings.team}<small>{slot.campaign.year} season</small></span></button>)}
        {!library.slots.length && <p className="launcher-sidebar-empty">Your first campaign starts here.</p>}
        <button className="launcher-sidebar-new" onClick={onNew}><Plus size={15} /> New campaign</button>
        <div className="launcher-sidebar-bottom"><Shield size={20} /><p>Five players.<br />One Aegis.</p></div>
      </aside>
      <main className="launcher-main">
        <section className="launcher-hero" aria-label="Dota 2">
          <div className="launcher-hero-title"><DotaMark /><div><h1 ref={heading} tabIndex={-1}>DOTA 2</h1><span>AEGIS MANAGER</span></div></div>
          <span className="launcher-hero-caption">YOUR TEAM. YOUR TIMELINE.</span>
        </section>
        <section className="launcher-playbar" aria-label="Launch game">
          <button className="launcher-play" onClick={() => setScreen("launching")}><Play fill="currentColor" size={27} /> PLAY</button>
          <div><span>CAMPAIGNS</span><strong>{library.slots.length} saved locally</strong></div>
          <div><span>STARTING ERAS</span><strong>2011 – 2026</strong></div>
          <span className="launcher-ready"><Check size={16} /> Ready to play</span>
        </section>
        <div className="launcher-content">
          <section className="launcher-welcome"><span className="launcher-section-label">DOTA 2 · TEAM MANAGEMENT</span><h2>The next chapter is yours.</h2><p>Take the manager’s seat. Build your five, prepare for the next patch, and lead your club to The International.</p><div className="launcher-feature-row"><span><CalendarDays size={17} /> Historical eras</span><span><Shield size={17} /> Your own club</span><span><Trophy size={17} /> The road to TI</span></div>
            <button className="launcher-text-button" onClick={() => setScreen("campaigns")}>Browse saved campaigns <ArrowRight size={16} /></button>
          </section>
          <section className="launcher-recent"><span className="launcher-section-label">PICK UP WHERE YOU LEFT OFF</span>{latest ? <><div className="launcher-recent-team">{badge(latest)}<div><h2>{latest.campaign.settings.team}</h2><span>{campaignDate(latest)}</span></div></div><p>{money(latest.campaign.cash)} <span>Club balance</span></p><button onClick={() => { setSelectedId(latest.id); setScreen("campaigns"); }}>View campaign <ChevronRight size={17} /></button></> : <><h2>An unwritten legacy.</h2><p>Choose a club and an era to begin your first season.</p><button onClick={onNew}>Start a new campaign <Plus size={17} /></button></>}</section>
        </div>
        {library.error && <p className="launcher-error" role="alert">{library.error}</p>}
      </main>
    </div> : <main className="launcher-campaign-screen">
      <button className="launcher-back" onClick={() => setScreen("library")}><ArrowLeft size={16} /> Back to library</button>
      <div className="launcher-picker-heading"><div><span className="launcher-section-label">DOTA 2 / AEGIS MANAGER</span><h1 ref={heading} tabIndex={-1}>Choose your campaign</h1><p>Return to your club, or write a different history.</p></div><button className="launcher-new" onClick={onNew}><Plus size={19} /> New campaign</button></div>
      {library.error && <p className="launcher-error" role="alert">{library.error}</p>}
      <div className="launcher-picker-grid"><section className="launcher-saves" aria-label="Saved campaigns">
        <div className="launcher-saves-header"><h2>Saved campaigns <span>{library.slots.length}</span></h2><label className="launcher-search"><Search size={15} /><input aria-label="Search campaigns" placeholder="Search club or year" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        <div className="launcher-save-list">{filtered.map(slot => <button key={slot.id} className={`launcher-save ${selected?.id === slot.id ? "selected" : ""}`} aria-pressed={selected?.id === slot.id} onClick={() => setSelectedId(slot.id)}>
          {badge(slot)}<span className="launcher-save-name"><strong>{slot.campaign.settings.team}</strong><span>{campaignDate(slot)}</span><small>Saved {savedDate(slot)}</small></span><ChevronRight size={18} />
        </button>)}{!filtered.length && <div className="launcher-empty"><FolderOpen size={34} /><h3>{query ? "No matching campaigns" : "Your story starts here"}</h3><p>{query ? "Try another club or year." : "Start a new campaign to choose your team and starting era."}</p>{!query && <button className="launcher-new" onClick={onNew}><Plus size={16} /> New campaign</button>}</div>}</div>
      </section>
      <section className="launcher-save-detail" aria-label="Selected campaign">{selected ? <>
        <span className="launcher-section-label">READY TO CONTINUE</span><div className="launcher-detail-team">{badge(selected)}<h2>{selected.campaign.settings.team}</h2></div>
        <dl><div><dt>Campaign date</dt><dd>{campaignDate(selected)}</dd></div><div><dt>Started in</dt><dd>{selected.campaign.settings.year}</dd></div><div><dt>Region</dt><dd>{selected.campaign.settings.region}</dd></div><div><dt>Club balance</dt><dd>{money(selected.campaign.cash)}</dd></div><div><dt>Difficulty</dt><dd>{selected.campaign.settings.difficulty}</dd></div></dl>
        <button className="launcher-load" onClick={() => {
          if (!selected.recovered) { onLoad(selected); return; }
          try { const id = saveCopy(selected.campaign, 'Recovered backup'); const copy = readCampaignLibrary().slots.find(slot => slot.id === id); if (copy) onLoad(copy); }
          catch { setFileStatus('Could not save a recovered copy. Export the backup to keep it safe.'); }
        }}><Play size={19} fill="currentColor" /> {selected.recovered ? 'Load backup as copy' : 'Load campaign'}</button>
        {selected.recovered && <p className="launcher-error">The latest save is damaged. This is its last readable backup; the original stored data is retained.</p>}
        <div className="launcher-save-tools"><button onClick={download}>Export campaign</button>{selected.backup && <button onClick={() => { try { saveCopy(selected.backup!.campaign, 'Backup'); } catch { setFileStatus('Could not save a backup copy. Export the campaign to keep a portable copy.'); } }}>Restore backup as copy</button>}</div>
        {selected.backup && <p className="launcher-save-note">Backup: {selected.backup.savedAt ? new Date(selected.backup.savedAt).toLocaleString() : 'Previous save'}. Restoring creates a separate campaign.</p>}
        <p className="launcher-save-note">Autosaves after every decision. Large saves and previous-date backups are compressed. Export a file to transfer between devices or browsers.</p>
      </> : <div className="launcher-detail-empty"><DotaMark /><h2>One team.<br />Infinite possibilities.</h2><p>Every career has its own save. Choose your era and make it yours.</p></div>}</section></div>
    </main>}
    <footer className="launcher-footer"><span><HardDrive size={13} /> Saves on this browser</span><span>Aegis Manager · Fan-made Dota management simulator</span></footer>
  </div>;
}
