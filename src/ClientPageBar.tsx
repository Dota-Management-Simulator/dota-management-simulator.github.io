import { ChevronLeft, ChevronRight, Gem, Mail, Power, Users } from "lucide-react";
import type { Campaign, Page } from "./game";
import { money } from "./game";
import { campaignMenu } from "./menu-eras";
import { unreadMessages } from "./office";
import { navigation } from "./GameNavigation";
import { ClientSystemMenu, ClientTabButton, useDeskShell } from "./ClientShell";
import type { ClientTab } from "./ClientShell";

const art = (name: string) => `${import.meta.env.BASE_URL}dota-menu/${name}`;
/** Same switch dates as the Desk clients (RebornClient.tsx, ClientDashboard.tsx). */
const SOURCE1_STORE = "2013-08-12";
const SHARDS = "2020-10-29";
const ARMORY = "2023-09-12";

type Group = { label: string; pages: Page[] };

/** The era's client tabs, grouped like the Desk's own tabs so a page sits under
 * the same tab on the Desk and away from it. */
function groups(layout: string, day: string): Group[] {
  if (layout === "beta") return [{ label: "Watch", pages: ["standings", "calendar", "history"] },
    { label: "Learn", pages: ["heroes", "patch", "training", "scrims", "next-series"] },
    { label: "Socialize", pages: ["world", "roster", "scouting", "staff", "finances", "inbox"] }];
  if (layout === "source1") {
    const modern = day >= SOURCE1_STORE;
    return [{ label: modern ? "Store" : "Customize", pages: ["finances", "scouting", "staff"] },
      { label: "Watch", pages: ["standings", "calendar", "history"] },
      { label: modern ? "Library" : "Learn", pages: ["heroes", "patch", "training", "next-series"] },
      { label: modern ? "Community" : "Socialize", pages: ["world", "roster", "scrims", "inbox"] }];
  }
  return [{ label: "Heroes", pages: ["heroes", "patch"] }, { label: day >= ARMORY ? "Armory" : "Store", pages: ["finances", "scouting", "staff"] },
    { label: "Watch", pages: ["standings", "calendar", "history"] }, { label: "Learn", pages: ["training", "scrims", "next-series"] },
    { label: "Arcade", pages: ["world"] }, { label: "Party", pages: ["roster", "inbox"] }];
}

/** Every page away from the Desk sits inside the era's Dota client: its top bar,
 * with the Dota symbol (or Today) back to the Desk, and a sub-tab strip for the
 * pages under the current tab. */
export default function ClientPageBar({ campaign, page, onPage }: { campaign: Campaign; page: Page; onPage: (page: Page) => void }) {
  const shell = useDeskShell();
  const { era, patch } = campaignMenu(campaign);
  const day = (campaign.calendar?.now ?? patch.startsOn).slice(0, 10);
  const layout = era.layout === "showcase" ? "reborn" : era.layout;
  const live = campaign.calendar?.runs.some(run => run.state === "playing") ?? false;
  const unread = unreadMessages(campaign);
  const all = groups(layout, day);
  const current = all.find(group => group.pages.includes(page));
  // Reborn opens Squad and the inbox from top-bar icons, so they have no tab there.
  const shown = layout === "reborn" ? all.filter(group => group.label !== "Party") : all;
  const tabs: ClientTab[] = shown.map(group => ({ label: group.label, pages: group.pages, active: group === current,
    badge: group.label === "Watch" && live ? "Live tournament" : undefined }));
  const desk = { label: "Today", open: () => onPage("overview"), active: page === "overview" };
  const mail = (className: string) => <button className={className} disabled={shell?.busy} onClick={() => onPage("inbox")} aria-label={`Inbox, ${unread} unread`}><Mail size={18} />{unread > 0 && <i>{unread}</i>}</button>;
  const sub = current && current.pages.length > 1 && <nav className="client-page-subtabs" aria-label={`${current.label} pages`}>
    {current.pages.map(target => <button key={target} className={target === page ? "is-active" : ""} aria-current={target === page ? "page" : undefined} disabled={shell?.busy} onClick={() => onPage(target)}>{navigation.find(entry => entry.page === target)?.label ?? target}</button>)}
  </nav>;

  if (layout === "beta") return <div className="client-page-bar is-beta">
    <header className="beta-top">
      <ClientSystemMenu className="beta-corner" />
      <nav aria-label="Client tabs">{[desk, ...tabs].map(tab => <ClientTabButton key={tab.label} tab={tab} onPage={onPage} />)}</nav>
      {mail("beta-corner client-page-mail")}
    </header>
    {sub}
  </div>;

  if (layout === "source1") return <div className="client-page-bar is-source1">
    <header className="s1-top">
      <ClientSystemMenu className="s1-corner" />
      <nav aria-label="Client tabs">{[desk, ...tabs].map(tab => <ClientTabButton key={tab.label} tab={tab} onPage={onPage} />)}</nav>
      {mail("s1-corner client-page-mail")}
    </header>
    {sub}
  </div>;

  return <div className={`client-page-bar is-reborn ${day >= SHARDS ? "is-modern" : ""}`}>
    <header className="rb-top">
      <ClientSystemMenu className="rb-icon" />
      <span className="rb-arrows" aria-hidden="true"><ChevronLeft size={18} /><ChevronRight size={18} /></span>
      <button className="rb-logo-tab" disabled={shell?.busy} onClick={() => onPage("overview")} aria-label="Back to the Manager’s Desk" title="Manager’s Desk"><img src={art("dota-symbol.png")} alt="" /></button>
      <nav aria-label="Client tabs">{tabs.map(tab => <ClientTabButton key={tab.label} tab={tab} onPage={onPage} />)}</nav>
      <div className="rb-top-right">
        {day >= SHARDS && <button className="rb-shards" disabled={shell?.busy} onClick={() => onPage("finances")}><Gem size={16} /><b>{money(campaign.cash)}</b><small>CLUB FUNDS</small></button>}
        <button className={`rb-icon ${page === "roster" ? "is-active" : ""}`} disabled={shell?.busy} onClick={() => onPage("roster")} aria-label="Open squad"><Users size={18} /></button>
        {mail(`rb-icon ${page === "inbox" ? "is-active" : ""}`)}
        <span className="rb-icon rb-power" aria-hidden="true"><Power size={17} /></span>
      </div>
    </header>
    {sub}
  </div>;
}
