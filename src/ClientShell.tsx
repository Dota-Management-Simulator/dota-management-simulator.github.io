import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Pause, Play, Power, Settings, Settings2 } from "lucide-react";
import type { Campaign, Page } from "./game";
import { money, weeklyIncome, weeklyWages } from "./game";
import type { ContinueAction } from "./manager-view";
import { navigation } from "./GameNavigation";
import { formatDate } from "./tournaments";

/** What the app shell hands the Desk clients when they replace its top bar and
 * Continue footer: the campaign action, busy lock and system controls. */
export interface DeskShell {
  action: ContinueAction | null;
  busy: boolean;
  onContinue: () => void;
  onHelp: () => void;
  onSettings: () => void;
  onExit?: () => void;
  saveStatus: string;
}
export const DeskShellContext = createContext<DeskShell | null>(null);
export const useDeskShell = () => useContext(DeskShellContext);

/** A client tab: one page opens directly, several open a dropdown. */
export type ClientTab = { label: string; pages?: Page[]; open?: () => void; active?: boolean; badge?: string };

/** Menus are fixed to the viewport under their trigger, so the scrolling tab
 * strips and the clients' clipped frames can't cut them off. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const root = useRef<HTMLDivElement>(null);
  const toggle = () => {
    const rect = root.current?.getBoundingClientRect();
    if (rect) setPlace({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)) });
    setOpen(!open);
  };
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);
  return { open, setOpen, toggle, root, style: { top: place.top, left: place.left } };
}

export function ClientTabButton({ tab, onPage }: { tab: ClientTab; onPage: (page: Page) => void }) {
  const shell = useDeskShell();
  const { open, setOpen, toggle, root, style } = usePopover();
  const pages = tab.pages ?? [];
  const click = () => tab.open ? tab.open() : pages.length === 1 ? onPage(pages[0]) : toggle();
  return <div className="client-tab" ref={root}>
    <button className={tab.active ? "is-active" : ""} aria-pressed={tab.open ? tab.active : undefined} aria-expanded={pages.length > 1 ? open : undefined} disabled={shell?.busy} onClick={click}>{tab.label}{tab.badge && <small>{tab.badge}</small>}</button>
    {open && <div className="client-tab-menu" role="menu" style={style}>{pages.map(page => {
      const item = navigation.find(entry => entry.page === page);
      return <button key={page} role="menuitem" onClick={() => { setOpen(false); onPage(page); }}><strong>{item?.label ?? page}</strong>{item && "description" in item && <small>{item.description}</small>}</button>;
    })}</div>}
  </div>;
}

/** The client's cog: handbook, settings and, on the Desk, menu effects. */
export function ClientSystemMenu({ motion, onMotion, className = "" }: { motion?: boolean; onMotion?: () => void; className?: string }) {
  const shell = useDeskShell();
  const { open, setOpen, toggle, root, style } = usePopover();
  const run = (action?: () => void) => { setOpen(false); action?.(); };
  return <div className={`client-system ${className}`} ref={root}>
    <button className="client-system-button" aria-label="Settings menu" aria-expanded={open} onClick={toggle}><Settings size={18} /></button>
    {open && <div className="client-tab-menu client-system-menu" role="menu" style={style}>
      {shell && <button role="menuitem" onClick={() => run(shell.onHelp)}><strong><BookOpen size={13} />Manager’s handbook</strong></button>}
      {shell && <button role="menuitem" onClick={() => run(shell.onSettings)}><strong><Settings2 size={13} />Organization settings</strong></button>}
      {shell?.onExit && <button role="menuitem" disabled={shell.busy} onClick={() => run(shell.onExit)}><strong><Power size={13} />Save / exit game</strong></button>}
      {onMotion && <button role="menuitem" onClick={() => run(onMotion)}><strong>{motion ? <Pause size={13} /> : <Play size={13} />}{motion ? "Pause" : "Play"} menu effects</strong></button>}
      {shell && <small className="client-system-status">{shell.saveStatus}</small>}
    </div>}
  </div>;
}

/** One exit action, with each client's original corner-button styling. */
export function ClientPowerButton({ className = "rb-icon rb-power", size = 17 }: { className?: string; size?: number }) {
  const shell = useDeskShell();
  return <button className={`client-power-button ${className}`} aria-label="Save and exit game" title="Save and exit game"
    disabled={!shell?.onExit || shell.busy} onClick={shell?.onExit}><Power size={size} /></button>;
}

/** Date, club funds and the campaign's next step, which used to sit in the footer. */
export function ClientStatus({ campaign, className = "", children }: { campaign: Campaign; className?: string; children?: ReactNode }) {
  const shell = useDeskShell();
  const net = weeklyIncome(campaign) - weeklyWages(campaign);
  return <div className={`client-status ${className}`}>
    <span className="client-status-date"><b>{campaign.calendar ? formatDate(campaign.calendar.now) : `Week ${campaign.week} · ${campaign.year}`}</b><small>{money(campaign.cash)} · {net > 0 ? "+" : ""}{money(net)} / week</small></span>
    {children}
    {shell?.action && <ContinueButton className="client-status-continue" />}
  </div>;
}

export function ContinueButton({ className = "", label }: { className?: string; label?: string }) {
  const shell = useDeskShell();
  if (!shell?.action) return null;
  return <button className={className} disabled={shell.busy} onClick={shell.onContinue} title={shell.action.detail}>
    {shell.busy ? "Series in progress" : label ?? shell.action.label}<ArrowRight size={16} />
  </button>;
}
