import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Bot, CalendarDays, ChevronDown, ClipboardList, Crosshair, Globe2, LayoutDashboard, Mail, Search, Shield, Sparkles, Swords, Trophy, UserRound, Users, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Page } from "./game";

type Destination = { page: Page; label: string; icon: LucideIcon; description: string };
type Department = { id: string; label: string; icon: LucideIcon; description: string; destinations: Destination[] };

export const departments: Department[] = [
  { id: "squad", label: "Squad", icon: Users, description: "Build your starting five.", destinations: [
    { page: "roster", label: "Squad", icon: Users, description: "Players, profiles & contracts" },
    { page: "scouting", label: "Player scouting", icon: Search, description: "Find your next signing" },
    { page: "staff", label: "Staff", icon: UserRound, description: "The people behind your players" },
  ] },
  { id: "practice", label: "Practice", icon: Crosshair, description: "Prepare for the next battle.", destinations: [
    { page: "training", label: "Training", icon: Crosshair, description: "Weekly plans & recovery" },
    { page: "scrims", label: "Scrims", icon: Swords, description: "Experiment against other teams" },
    { page: "arcade", label: "Arcade", icon: Bot, description: "OpenAI Five & All-Star exhibitions" },
  ] },
  { id: "compete", label: "Compete", icon: Trophy, description: "Take the road to the Aegis.", destinations: [
    { page: "calendar", label: "Season calendar", icon: CalendarDays, description: "Events, invitations & matches" },
    { page: "next-series", label: "Scout your next series", icon: ClipboardList, description: "Prepare for your opponent" },
    { page: "standings", label: "TI race & standings", icon: BarChart3, description: "Follow the race to TI" },
  ] },
  { id: "world", label: "World", icon: Globe2, description: "Learn the game. Know your rivals.", destinations: [
    { page: "heroes", label: "Heroes", icon: Shield, description: "Explore your available hero pool" },
    { page: "patch", label: "Patch & meta", icon: Sparkles, description: "Discover the changing battlefield" },
    { page: "world", label: "Teams", icon: Globe2, description: "Clubs, lineups & public results" },
  ] },
  { id: "club", label: "Club", icon: Shield, description: "Keep your dynasty running.", destinations: [
    { page: "inbox", label: "Inbox", icon: Mail, description: "Your messages & decisions" },
    { page: "finances", label: "Finances & sponsors", icon: Wallet, description: "Budget, partners & agreements" },
    { page: "history", label: "Season history", icon: Trophy, description: "Results from your journey" },
  ] },
];

export const navigation = [
  { page: "overview" as const, label: "Manager’s Desk", icon: LayoutDashboard },
  ...departments.flatMap(department => department.destinations),
];

export default function GameNavigation({ page, unread, busy, onPage }: {
  page: Page; unread: number; busy: boolean; onPage: (page: Page) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const department = departments.find(item => item.id === open);

  useEffect(() => { setOpen(null); }, [page, busy]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        triggers.current.get(open)?.focus();
        setOpen(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <nav className="game-navigation" aria-label="Main navigation" ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
    <div className="game-orbits">
      <button className={`orbit-button orbit-desk ${page === "overview" ? "is-current" : ""}`} onClick={() => { setOpen(null); onPage("overview"); }}
        disabled={busy} aria-label="Manager’s Desk" title="Manager’s Desk" aria-current={page === "overview" ? "page" : undefined}>
        <img className="desk-dota-symbol" src={`${import.meta.env.BASE_URL}dota-menu/dota-symbol.png`} alt="" />
      </button>
      {departments.map(item => {
        const active = item.destinations.some(destination => destination.page === page);
        const expanded = open === item.id;
        const DepartmentIcon = item.icon;
        return <div className={`orbit-group department-${item.id}`} key={item.id}>
          <button ref={element => { if (element) triggers.current.set(item.id, element); else triggers.current.delete(item.id); }}
            className={`orbit-button ${active ? "is-current" : ""} ${expanded ? "is-open" : ""}`} disabled={busy}
            aria-label={item.label} aria-expanded={expanded} aria-controls={expanded ? `department-${item.id}` : undefined} onClick={() => setOpen(expanded ? null : item.id)}>
            <span className="orbit-medallion"><DepartmentIcon size={23} />{item.id === "club" && unread > 0 && <span className="orbit-badge" aria-label={`${unread} unread messages`}>{unread > 99 ? "99+" : unread}</span>}</span>
            <span>{item.label}<ChevronDown className="orbit-chevron" size={11} /></span>
          </button>
          {expanded && department && <div className="department-popover" id={`department-${item.id}`}>
            <div className="department-heading"><div><strong>{department.label}</strong><p>{department.description}</p></div>
              <button className="icon-button" aria-label={`Close ${department.label} options`} onClick={() => { setOpen(null); triggers.current.get(item.id)?.focus(); }}><X size={17} /></button></div>
            <div className="department-options">{department.destinations.map(destination => {
              const DestinationIcon = destination.icon;
              return <button key={destination.page} aria-current={page === destination.page ? "page" : undefined}
                onClick={() => { setOpen(null); onPage(destination.page); }}>
                <span className="destination-symbol"><DestinationIcon size={21} /></span><span><strong>{destination.label}</strong><small>{destination.description}</small></span><ArrowRight size={16} />
              </button>;
            })}</div>
          </div>}
        </div>;
      })}
    </div>
  </nav>;
}
