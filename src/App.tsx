import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Coins,
  Crosshair,
  Flame,
  Globe2,
  Heart,
  LayoutDashboard,
  Mail,
  Leaf,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  advanceWeek,
  createCampaign,
  DEFAULT_SETTINGS,
  eventResult,
  events,
  hireStaff,
  dismissStaff,
  money,
  nextEvent,
  rating,
  readSave,
  ROLES,
  SAVE_KEY,
  shortMoney,
  buildBattleConfig,
  prepareEvent,
  settleEvent,
  opponentFor,
  statNames,
  teamPlayers,
  playerTeam,
  weeklyIncome,
  weeklyWages,
} from "./game";
import type {
  Campaign,
  Difficulty,
  GameEvent,
  Page,
  Player,
  Settings,
  Training,
  Result,
} from "./game";
import { ComputingMatch, MatchViewer, SeriesResults } from "./MatchExperience";
import type { SimulatedSeries } from "./battle";
import PatchMeta from "./PatchMeta";
import PatchArrival from "./PatchArrival";
import PlayerTalents from "./PlayerTalents";
import StaffOffice from "./StaffOffice";
import WorldTeams from "./WorldTeams";
import TeamBadge from "./TeamBadge";
import Avatar, { PortraitCredit } from "./PlayerAvatar";
import ContractNegotiation from "./ContractNegotiation";
import SponsorMarket from "./SponsorMarket";
import HistoricalCalendar, { TournamentHistory } from "./HistoricalCalendar";
import ManagerInbox from "./ManagerInbox";
import { advanceManagerWeek, syncOffice, unreadMessages } from "./office";
import type { OfficeAction } from "./office";
import { enableHistoricalCalendar, nextTournamentCommitment } from "./historical-game";
import { formatDate } from "./tournaments";
import { weeklyPractice } from "./contracts";
import { teamIdForName } from "./team-logos";
import { trainingEffect, trainingOptions } from "./training";
import TrainingWorkload from "./TrainingWorkload";
import TrainingPresets from "./TrainingPresets";
import TrainingQuickSlots from "./TrainingQuickSlots";
import { PlayerProfileTabs } from "./PlayerPerformance";
import { getStartingTeams, rosterYearForStart, sourceFor, customClubNameAvailable } from "./history";
import ClubBrandingEditor from "./ClubBrandingEditor";
import { ClubIdentityContext } from "./ClubIdentity";
import { useClubAppearance } from "./useClubAppearance";
import CampaignBar from "./CampaignBar";
import ManagerDesk from "./ManagerDesk";
import SquadWorkspace from "./SquadWorkspace";
import { managerContinue, managerCompetition } from "./manager-view";
import CompetitionStandings from "./CompetitionStandings";

const navigation: {
  page: Page;
  label: string;
  icon: LucideIcon;
  group?: string;
}[] = [
  {
    page: "overview",
    label: "Manager’s Desk",
    icon: LayoutDashboard,
    group: "YOUR ORGANIZATION",
  },
  { page: "roster", label: "Squad", icon: Users },
  { page: "inbox", label: "Inbox", icon: Mail },
  { page: "training", label: "Training", icon: Crosshair },
  { page: "scouting", label: "Scouting", icon: Search },
  { page: "staff", label: "Staff", icon: UserRound },
  {
    page: "standings",
    label: "TI race & standings",
    icon: BarChart3,
    group: "THE COMPETITION",
  },
  { page: "calendar", label: "Season calendar", icon: CalendarDays },
  { page: "patch", label: "Patch & meta", icon: Sparkles },
  { page: "world", label: "World teams", icon: Globe2 },
  { page: "history", label: "Season history", icon: Trophy },
  {
    page: "finances",
    label: "Finances & sponsors",
    icon: Wallet,
    group: "THE BUSINESS",
  },
];
const pageText: Record<
  Page,
  { eyebrow: string; title: string; description: string }
> = {
  standings: {
    eyebrow: "THE COMPETITION",
    title: "The road to the Aegis.",
    description: "Team form, TI places and the latest campaign champions.",
  },
  inbox: {
    eyebrow: "YOUR ORGANIZATION",
    title: "Your next decision starts here.",
    description: "Invitations, player agreements, sponsor updates and the messages that matter.",
  },
  overview: {
    eyebrow: "THE BIG PICTURE",
    title: "Welcome to headquarters.",
    description:
      "Five players. One shared ambition. Your next chapter starts here.",
  },
  roster: {
    eyebrow: "YOUR ORGANIZATION",
    title: "More than five players.",
    description:
      "Build a roster with the talent, chemistry, and confidence to go all the way.",
  },
  training: {
    eyebrow: "PLAYER DEVELOPMENT",
    title: "Greatness takes practice.",
    description: "Find the balance between a sharper team and a rested one.",
  },
  scouting: {
    eyebrow: "THE TRANSFER MARKET",
    title: "Find your missing piece.",
    description:
      "Explore regional talent, free agents, and players at other clubs.",
  },
  staff: {
    eyebrow: "BEHIND THE PLAYERS",
    title: "Build the team behind the team.",
    description:
      "A little expertise goes a long way. Give your players the right support.",
  },
  calendar: {
    eyebrow: "THE COMPETITION",
    title: "Choose your moments.",
    description:
      "Plan your tournament dates, earn your place, and arrive ready to play.",
  },
  patch: {
    eyebrow: "UNDERSTAND THE GAME",
    title: "The meta is a moving target.",
    description:
      "Learn what the patch rewards. Find where your team has an edge.",
  },
  finances: {
    eyebrow: "THE BUSINESS",
    title: "Keep the dream funded.",
    description:
      "Sustainable teams start with a healthy balance sheet and the right partners.",
  },
  history: {
    eyebrow: "YOUR LEGACY",
    title: "Every season tells a story.",
    description:
      "The wins, the lessons, and the long road to lifting the Aegis.",
  },
  world: {
    eyebrow: "THE HISTORICAL WORLD",
    title: "The teams around you.",
    description: "Follow every club's lineup as recruitment and the post-TI shuffle reshape the scene.",
  },
};
function Icon({
  icon: I,
  size = 18,
  ...rest
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
}) {
  return <I size={size} strokeWidth={1.65} {...rest} />;
}
function Aegis({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 230"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m100 12 76 42-15 103-61 61-61-61L24 54Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m100 30 59 33-12 86-47 48-47-48-12-86Z"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".5"
      />
      <path d="m100 60 41 96h-25l-16-40-16 40H59Z" fill="currentColor" />
      <path d="m85 157 15-14 15 14-15 17Z" fill="currentColor" />
      <path
        d="M100 0v33M13 48l30 17m114 0 30-17M24 171l27-17m98 0 27 17M100 197v33"
        stroke="currentColor"
        opacity=".4"
      />
      <circle
        cx="100"
        cy="108"
        r="90"
        stroke="currentColor"
        strokeDasharray="2 8"
        opacity=".3"
      />
    </svg>
  );
}
function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Meter({ value, tone = "" }: { value: number; tone?: string }) {
  return (
    <span className={`meter ${tone}`}>
      <span style={{ width: `${value}%` }} />
    </span>
  );
}
function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [campaign, setCampaign] = useState<Campaign | null>(() => readSave());
  const [setup, setSetup] = useState(() => !readSave());
  const [page, setPage] = useState<Page>("overview");
  const [calendarTarget, setCalendarTarget] = useState<string | undefined>();
  const [calendarRequest, setCalendarRequest] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [player, setPlayer] = useState<Player | null>(null);
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simDone, setSimDone] = useState(false);
  const [pendingSimulation, setPendingSimulation] =
    useState<SimulatedSeries | null>(null);
  const [workerError, setWorkerError] = useState("");
  const [viewResult, setViewResult] = useState<Result | null>(null);
  const [help, setHelp] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [toast, setToast] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [patchTarget, setPatchTarget] = useState<string>();
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const workerRef = useRef<Worker | null>(null);
  const skipRequested = useRef(false);
  const settled = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (campaign) setCampaign(current => current ? syncOffice(current) : current);
  }, [campaign]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#141a16" : "#f6f7f3");
    try {
      localStorage.setItem("aegis-manager-theme", theme);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
  }, [theme]);
  const startingClubs = getStartingTeams(settings.year);
  const selectedClub = startingClubs.find((t) => t.id === settings.historicalTeamId) ?? startingClubs[0];
  const identitySettings = setup ? settings : campaign?.settings;
  const identityTeamId = setup ? (settings.clubMode === "custom" ? "managed-custom" : selectedClub.id) : campaign?.world?.managedTeamId;
  const clubBranding = useClubAppearance({ branding: identitySettings?.branding, teamId: identityTeamId,
    year: setup ? settings.year : campaign?.year ?? 2011, custom: identitySettings?.clubMode === "custom" || identityTeamId === "managed-custom",
    theme, enabled: !!identitySettings });
  useEffect(() => {
    if (campaign) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(campaign));
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    }
  }, [campaign]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [setup, page]);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );
  const modalOpen = !!(
    player ||
    event ||
    help ||
    preferences ||
    confirmNew ||
    viewResult
  );
  useEffect(() => {
    if (!modalOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'));
    (focusables()[0] || dialog)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !simulating) {
        setPlayer(null);
        setViewResult(null);
        setEvent(null);
        setHelp(false);
        setPreferences(false);
        setConfirmNew(false);
      }
      if (e.key === "Tab") {
        const list = focusables();
        const first = list[0];
        const last = list[list.length - 1];
        if (!list.length) {
          e.preventDefault();
          dialog?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [modalOpen, simulating, !!pendingSimulation, simDone, viewResult]);
  const go = (p: Page) => {
    if (!campaign || setup) return;
    if (p === "calendar") setCalendarTarget(undefined);
    if (p === "patch") setPatchTarget(undefined);
    setPage(p);
    setMobileMenu(false);
    setFilter("");
    setRoleFilter("All roles");
    window.scrollTo(0, 0);
  };
  const update = (f: (c: Campaign) => Campaign) =>
    setCampaign((c) => (c ? f(c) : c));
  const inboxAction = (action: OfficeAction) => {
    if (action.kind === "tournament") { go("calendar"); setCalendarTarget(action.eventId); setCalendarRequest(n => n + 1); }
    else if (action.kind === "patch") { go("patch"); setPatchTarget(action.patchId); }
    else if (action.kind === "player") {
      const target = campaign?.players.find(p => p.id === action.playerId);
      if (target) setPlayer(target);
    } else go(action.page);
  };
  const start = () => {
    setCampaign(enableHistoricalCalendar(createCampaign(settings)));
    setSetup(false);
    setPage("overview");
    setConfirmNew(false);
    notify("Your campaign has begun. Welcome to the organization.");
  };
  const newCampaign = () => {
    setPreferences(false);
    setSetup(true);
    setMobileMenu(false);
  };
  const openEvent = (e: GameEvent) => {
    setEvent(e);
    setSimDone(false);
    setProgress(0);
    setPendingSimulation(null);
    setWorkerError("");
    settled.current = false;
    skipRequested.current = false;
  };
  const finishSimulation = (simulation: SimulatedSeries) => {
    if (!event || settled.current) return;
    settled.current = true;
    update((c) => settleEvent(c, event, simulation.summary));
    setPendingSimulation(null);
    setProgress(100);
    setSimulating(false);
    setSimDone(true);
  };
  const runSimulation = () => {
    if (!event || !campaign || simulating) return;
    setSimulating(true);
    setProgress(0);
    setWorkerError("");
    skipRequested.current = false;
    settled.current = false;
    try {
      const worker = new Worker(
        new URL("./battle.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;
      const fail = (message: string) => {
        worker.terminate();
        workerRef.current = null;
        setSimulating(false);
        setWorkerError(message);
      };
      worker.onmessage = ({ data: message }) => {
        if (workerRef.current !== worker) return;
        if (message.type === "progress") setProgress((message.games / 3) * 100);
        else if (message.type === "complete") {
          worker.terminate();
          workerRef.current = null;
          if (skipRequested.current) finishSimulation(message.simulation);
          else setPendingSimulation(message.simulation);
        } else if (message.type === "error") fail(message.message);
      };
      worker.onerror = (error) => {
        error.preventDefault();
        fail(
          "The match worker could not finish. Your campaign has not changed.",
        );
      };
      worker.postMessage(
        buildBattleConfig(prepareEvent(campaign, event), event),
      );
    } catch {
      setSimulating(false);
      setWorkerError(
        "This browser could not start the match worker. Your campaign has not changed.",
      );
    }
  };
  const advance = () => {
    if (campaign?.calendar) {
      const next = advanceManagerWeek(campaign);
      setCampaign(next);
      if (next.calendar!.now === campaign.calendar.now) {
        go("calendar");
        const commitment = nextTournamentCommitment(campaign);
        notify(commitment && Date.parse(commitment.at) <= Date.parse(campaign.calendar.now) ? "Your next tournament series is due. Play it before advancing time." : "A tournament decision is due. Review your invitation or reserved event in the calendar.");
      } else notify(`Advanced to ${formatDate(next.calendar!.now)}. Check your inbox for club updates.`);
    } else {
      update(advanceWeek);
      notify("A week completed. Training, recovery, and finances updated.");
    }
  };
  const roster = campaign ? teamPlayers(campaign) : [];
  const currentPlayer =
    player && campaign
      ? campaign.players.find((p) => p.id === player.id)!
      : null;
  const continueAction = campaign ? managerContinue(campaign) : null;
  const continueCampaign = () => {
    if (!continueAction || calendarBusy || simulating) return;
    if (continueAction.kind === "tournament") inboxAction({ kind: "tournament", eventId: continueAction.eventId });
    else if (continueAction.kind === "legacy-event") openEvent(continueAction.event);
    else advance();
  };
  const openCompetition = () => {
    if (!campaign) return;
    const competition = managerCompetition(campaign);
    if (!competition) go("calendar");
    else if (!competition.legacy) inboxAction({ kind: "tournament", eventId: competition.eventId });
    else {
      const next = nextEvent(campaign);
      if (next && (next.kind !== "ti" || campaign.qualified)) openEvent(next);
      else go("calendar");
    }
  };
  const activeEventResult =
    campaign && event ? eventResult(campaign, event.id) : null;
  const setupName = settings.clubMode === "custom" ? settings.team.trim() : selectedClub.name;
  const nameConflict = settings.clubMode === "custom" && !!setupName && !customClubNameAvailable(setupName, selectedClub.id);
  const matchesScout = (p: Player) => campaign && !campaign.roster.includes(p.id) &&
    (roleFilter === "All roles" || p.role === roleFilter) &&
    `${p.name} ${p.firstName} ${p.lastName} ${p.region} ${playerTeam(campaign, p.id)} ${p.historical?.aliases.join(" ") ?? ""}`.toLowerCase().includes(filter.toLowerCase());

  return (
    <ClubIdentityContext.Provider value={{ teamId: identityTeamId, name: identitySettings?.team ?? "", branding: clubBranding }}>
    <div className={`app-shell ${campaign && !setup ? "game-shell" : ""}`}>
      {mobileMenu && (
        <div className="nav-scrim" onClick={() => setMobileMenu(false)} />
      )}
      {campaign && !setup && <PatchArrival campaign={campaign} busy={modalOpen || calendarBusy || simulating}
        onDismiss={id => update(c => ({ ...c, seenPatchMilestones: [...new Set([...(c.seenPatchMilestones ?? []), id])] }))}
        onRead={() => go("patch")} />}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (campaign && !setup) go("overview");
          }}
        >
          <Aegis />
          <span>
            AEGIS<small>TEAM MANAGER</small>
          </span>
        </a>
        <div className="organization">
          {campaign && !setup ? <TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="small" /> : <div className="org-mark"><Shield size={19} /></div>}
          <div>
            <strong>
              {campaign && !setup
                ? campaign.settings.team
                : "Your next dynasty"}
            </strong>
            <small>
              {campaign && !setup
                ? `${campaign.settings.region} · ${campaign.year} season`
                : "An unwritten story"}
            </small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <div key={n.page}>
              {n.group && <div className="nav-label">{n.group}</div>}
              <button
                className={`nav-link ${!setup && page === n.page ? "active" : ""}`}
                onClick={() => go(n.page)}
                disabled={!campaign || setup}
              >
                <Icon icon={n.icon} />
                <span>{n.label}</span>
                {n.page === "inbox" && campaign && unreadMessages(campaign) > 0 && <span className="inbox-count">{unreadMessages(campaign)}</span>}
                {!setup && page === n.page && <span className="active-dot" />}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setHelp(true)}>
            <CircleHelp size={17} /> Manager's handbook{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="build-label">
            <span className="status-dot" /> PROTOTYPE 0.1 <span>LOCAL</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="shell-header">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={20} />
            </button>
            <span>{campaign && !setup ? "Club office" : "Workspace"}</span>
            <ChevronRight size={13} />
            <strong>
              {setup
                ? "New campaign"
                : navigation.find((n) => n.page === page)?.label}
            </strong>
          </div>
          <div className="topbar-actions">
            {campaign && !setup && <button className="icon-button inbox-shortcut" aria-label={`Open inbox, ${unreadMessages(campaign)} unread messages`} onClick={() => go("inbox")}><Mail size={18} />{unreadMessages(campaign) > 0 && <span className="inbox-count">{unreadMessages(campaign)}</span>}</button>}
            <span className="save-indicator">
              <span className={`status-dot ${saveError ? "warning" : ""}`} />
              {saveError
                ? "Save unavailable"
                : campaign
                  ? "Saved on this browser"
                  : "A fresh start"}
            </span>
            <button
              className="icon-button theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Organization settings"
              title="Organization settings"
              onClick={() => setPreferences(true)}
            >
              <Settings2 size={18} />
            </button>
            <div className="manager-avatar">GM</div>
          </div>
        </header>
        {campaign && !setup && continueAction && <CampaignBar campaign={campaign} action={continueAction} busy={calendarBusy || simulating} onContinue={continueCampaign} onPatch={() => go("patch")} />}
        </div>
        <main>
          {setup ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">WRITE YOUR OWN HISTORY</div>
                  <h1>A new era awaits.</h1>
                  <p>Build a team. Shape the meta. Chase the Aegis.</p>
                </div>
                {campaign && (
                  <button
                    className="button secondary"
                    onClick={() => setSetup(false)}
                  >
                    <ChevronLeft size={15} /> Back to campaign
                  </button>
                )}
              </div>
              <div className="setup-layout">
                <div className="setup-form">
                  <section className="panel setup-section">
                    <div className="numbered-title">
                      <span>01</span>
                      <div>
                        <h2>Your organization</h2>
                        <p>Every great team starts with an identity.</p>
                      </div>
                      <Shield size={22} />
                    </div>
                    <div className="form-row">
                      <label>
                        Your club
                        <select aria-label="Club type" value={settings.clubMode ?? "historical"} onChange={(e) => setSettings({ ...settings, branding: undefined, clubMode: e.target.value as "historical" | "custom", team: e.target.value === "historical" ? selectedClub.name : "Atlas Esports" })}>
                          <option value="historical">Manage a historical team</option>
                          <option value="custom">Create a club and replace a team</option>
                        </select>
                      </label>
                      <label>
                        {settings.clubMode === "custom" ? "Team to replace" : settings.year === 2011 ? "Original TI team" : "Historical team"}
                        <div className="select-wrap">
                          <Globe2 size={16} />
                          <select
                            aria-label="Historical team"
                            value={selectedClub.id}
                            onChange={(e) => { const t = startingClubs.find((t) => t.id === e.target.value)!; setSettings({ ...settings, historicalTeamId: t.id, region: t.region, team: settings.clubMode === "custom" ? settings.team : t.name }); }}
                          >
                            {startingClubs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </label>
                    </div>
                    <div className="setup-club-badge"><TeamBadge teamId={settings.clubMode === "custom" ? "managed-custom" : selectedClub.id} name={setupName} year={settings.year} size="large" /><strong>{setupName || "Your club"}</strong></div>
                    {settings.clubMode === "custom" && <label className="custom-club-name">Team name<input maxLength={32} value={settings.team} onChange={(e) => setSettings({ ...settings, team: e.target.value })} /></label>}
                    {settings.clubMode === "custom" && <ClubBrandingEditor value={clubBranding} name={setupName} teamId="managed-custom" year={settings.year}
                      onChange={branding => setSettings(current => ({ ...current, branding }))} />}
                    <p className="field-note">{selectedClub.region} · {settings.clubMode === "custom" ? `Your club inherits ${selectedClub.name}'s players and regional place. The original club leaves this campaign.` : `Start with this organization's ${settings.year === 2011 ? "TI1" : rosterYearForStart(settings.year)} reference lineup.`}</p>
                    <p className="field-note">{selectedClub.roster.join(" · ")}</p>
                    {nameConflict && <p className="field-note" role="alert">That name belongs to another club in this world.</p>}
                  </section>
                  <section className="panel setup-section">
                    <div className="numbered-title">
                      <span>02</span>
                      <div>
                        <h2>Choose your starting era</h2>
                        <p>
                          Start at the beginning, or make a later season your
                          own.
                        </p>
                      </div>
                      <CalendarDays size={22} />
                    </div>
                    <div
                      className={`era-card ${settings.year === 2011 ? "selected" : ""}`}
                    >
                      <div className="era-symbol">
                        <Aegis />
                      </div>
                      <div>
                        <div className="era-heading">
                          <strong>
                            {settings.year === 2011
                              ? "The beginning of everything"
                              : settings.year > 2026
                                ? "The next generation"
                                : "A different chapter"}
                          </strong>
                          <Badge tone="gold">
                            {settings.year === 2011
                              ? "CLASSIC"
                              : settings.year > 2026
                                ? "FUTURE SANDBOX"
                                : "HISTORICAL ERA"}
                          </Badge>
                        </div>
                        <p>
                          {settings.year === 2011
                            ? "The International, 2011. A new stage. An unwritten legacy."
                            : `Begin in ${settings.year} with a fresh roster and an open road to TI.`}
                        </p>
                      </div>
                      <Check size={18} />
                    </div>
                    <div className="year-control">
                      <label htmlFor="starting-year">Starting year</label>
                      <div className="year-stepper">
                        <button
                          aria-label="Earlier starting year"
                          disabled={settings.year <= 2011}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              year: settings.year - 1,
                            })
                          }
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <select
                          id="starting-year"
                          value={settings.year}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              year: Number(e.target.value),
                            })
                          }
                        >
                          {Array.from({ length: 16 }, (_, i) => 2011 + i).map(
                            (y) => (
                              <option key={y} value={y}>
                                {y}
                                {y === 2011 ? " · Classic" : ""}
                              </option>
                            ),
                          )}
                        </select>
                        <button
                          aria-label="Later starting year"
                          disabled={settings.year >= 2026}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              year: settings.year + 1,
                            })
                          }
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <span>2011 — 2026</span>
                    </div>
                    <p className="field-note">
                      {settings.year === 2011 ? "Start at TI1. Regional players and 18 more heroes arrive after TI." : `Start with completed shuffles through ${rosterYearForStart(settings.year)}.`} Annual player and hero batches enter at the post-TI shuffle through 2026. Historical events use sourced formats, dates and placement prizes; gameplay ratings remain estimates.
                    </p>
                  </section>
                  <section className="panel setup-section">
                    <div className="numbered-title">
                      <span>03</span>
                      <div>
                        <h2>Set the challenge</h2>
                        <p>Your starting resources and the margin for error.</p>
                      </div>
                      <Target size={22} />
                    </div>
                    <div className="difficulty-grid">
                      {(
                        [
                          {
                            name: "Club",
                            icon: Leaf,
                            tag: "Room to grow",
                            desc: "$150k budget · more forgiving opponents",
                          },
                          {
                            name: "Contender",
                            icon: Swords,
                            tag: "The intended challenge",
                            desc: "$100k budget · balanced competition",
                          },
                          {
                            name: "Legend",
                            icon: Flame,
                            tag: "Earn every advantage",
                            desc: "$65k budget · tougher opponents",
                          },
                        ] as {
                          name: Difficulty;
                          icon: LucideIcon;
                          tag: string;
                          desc: string;
                        }[]
                      ).map((d) => (
                        <button
                          key={d.name}
                          aria-pressed={settings.difficulty === d.name}
                          className={`difficulty ${settings.difficulty === d.name ? "selected" : ""}`}
                          onClick={() =>
                            setSettings({ ...settings, difficulty: d.name })
                          }
                        >
                          <div>
                            <Icon icon={d.icon} size={21} />
                            <span className="radio-dot" />
                          </div>
                          <strong>{d.name}</strong>
                          <span>{d.tag}</span>
                          <small>{d.desc}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="setup-bottom">
                    <span>
                      <Shield size={15} /> Your progress stays on this browser.
                    </span>
                    <button
                      className="button primary"
                      disabled={!setupName || nameConflict}
                      onClick={() => (campaign ? setConfirmNew(true) : start())}
                    >
                      Begin your story <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
                <aside className="setup-preview">
                  <div className="campaign-art">
                    <div className="art-grid" />
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="art-top">
                      <span>THE ROAD TO</span>
                      <span>01 / ∞</span>
                    </div>
                    <Aegis className="hero-aegis" />
                    <div className="art-caption">
                      <span>THE</span>
                      <strong>INTERNATIONAL</strong>
                      <small>History remembers the ones who lift it.</small>
                    </div>
                  </div>
                  <div className="preview-content">
                    <div className="eyebrow">YOUR CAMPAIGN, AT A GLANCE</div>
                    <h3>{setupName || "Your organization"}</h3>
                    <div className="preview-row">
                      <span>First season</span>
                      <strong>
                        {settings.year}
                        {settings.year === 2011 && " · Classic"}
                      </strong>
                    </div>
                    <div className="preview-row">
                      <span>Home region</span>
                      <strong>{selectedClub.region}</strong>
                    </div>
                    <div className="preview-row">
                      <span>Difficulty</span>
                      <strong>{settings.difficulty}</strong>
                    </div>
                    <div className="preview-row">
                      <span>Starting roster</span>
                      <strong>5 historical players</strong>
                    </div>
                    <div className="preview-rule" />
                    <div className="little-note">
                      <Sparkles size={18} />
                      <p>
                        A small beginning.
                        <br />
                        <strong>An entirely different history.</strong>
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="prototype-note">
                <span className="tiny-square" /> THE FOUNDATION BUILD{" "}
                <span>Historical players. Your alternate history.</span>
              </div>
            </>
          ) : (
            campaign && (
              <>
                <div className="page-heading game-page-heading">
                  <div><div className="eyebrow">{pageText[page].eyebrow}</div><h1>{navigation.find(n => n.page === page)?.label}</h1></div>
                  <span className="game-page-note">{page === "overview" ? "Assess. Decide. Continue." : page === "roster" ? "Five players. One shared ambition." : pageText[page].description}</span>
                </div>
                {campaign.cash < 0 && (
                  <div className="alert warning">
                    Your balance is below zero. Unpaid payroll reduces player
                    happiness each week. Sign a sponsor or pursue tournament
                    earnings.
                  </div>
                )}
                {page === "overview" && <ManagerDesk campaign={campaign} onPage={go} onAction={inboxAction} onPlayer={setPlayer} onCompetition={openCompetition} />}
                {page === "roster" && <SquadWorkspace campaign={campaign} onProfile={setPlayer} onTraining={() => go("training")} onScout={() => go("scouting")} />}
                {page === "standings" && <CompetitionStandings campaign={campaign} onTournament={id => id ? inboxAction({ kind: "tournament", eventId: id }) : go("calendar")} onResults={winner => {
                  const result = campaign.results.find(r => winner.archived ? `legacy:${r.year}:${r.eventId}` === winner.eventId : r.tournamentId === winner.eventId);
                  if (result) setViewResult(result);
                  else inboxAction({ kind: "tournament", eventId: winner.eventId });
                }} />}
                {page === "training" && (
                  <>
                    <div className="info-strip">
                      <span>
                        <Zap size={17} /> Training resolves when you{" "}
                        <strong>advance a week</strong>
                      </span>
                      <span>
                        Longer hours and higher intensity spend more energy.
                      </span>
                    </div>
                    <section className="panel">
                      <SectionTitle
                        title="The weekly plan"
                        sub="Individual focus. A shared goal."
                        action={
                          <div className="training-plan-actions">
                            <TrainingQuickSlots campaign={campaign} onChange={update} notify={notify} />
                            <button
                              className="button secondary small-button"
                              onClick={() => {
                                update((c) => ({
                                  ...c,
                                  training: Object.fromEntries(
                                    c.players.map((p) => [p.id, "Rest"]),
                                  ),
                                }));
                                notify(
                                  "The squad is scheduled for a recovery week.",
                                );
                              }}
                            >
                              <Leaf size={15} /> Rest the squad
                            </button>
                          </div>
                        }
                      />
                      <TrainingPresets campaign={campaign} onChange={update} notify={notify} />
                      <div className="training-table">
                        <div className="table-head">
                          <span>PLAYER</span>
                          <span>ENERGY</span>
                          <span>TRAINING FOCUS</span>
                          <span>EXPECTED EFFECT</span>
                        </div>
                        {roster.map((p) => (
                          <div className="training-row" key={p.id}>
                            <button
                              type="button"
                              className="player-cell plain-button training-player"
                              onClick={() => setPlayer(p)}
                              aria-label={`View ${p.name}'s player profile`}
                            >
                              <Avatar player={p} small />
                              <span>
                                <strong>{p.name}</strong>
                                <small>{p.role}</small>
                              </span>
                            </button>
                            <div className="energy-cell">
                              <span>{p.energy}%</span>
                              <Meter value={p.energy} />
                            </div>
                            <select
                              aria-label={`Training for ${p.name}`}
                              value={campaign.training[p.id] || "Balanced"}
                              onChange={(e) =>
                                update((c) => ({
                                  ...c,
                                  training: {
                                    ...c.training,
                                    [p.id]: e.target.value as Training,
                                  },
                                }))
                              }
                            >
                              {trainingOptions(p).map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.options.map((t) => (
                                    <option key={t} value={t}>{t === "Rest" ? "Rest / energy" : t}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <small className="training-effect">
                              {(() => {
                                const effect = weeklyPractice(campaign, p, campaign.training[p.id] || "Balanced");
                                return trainingEffect(campaign.training[p.id] || "Balanced", effect, campaign.cash + weeklyIncome(campaign) - weeklyWages(campaign) < 0);
                              })()}
                            </small>
                            <TrainingWorkload campaign={campaign} player={p} onChange={update} />
                          </div>
                        ))}
                      </div>
                    </section>
                    <div className="two-col">
                      <section className="panel feature-panel">
                        <Crosshair size={28} />
                        <h3>Train with intention.</h3>
                        <p>
                          Choose any of the 12 player attributes or a playstyle
                          from their profile. Laning also improves skirmish,
                          teamfights also builds stability, and hero pool also
                          develops creativity. Map awareness trains vision,
                          intuition, and pushing. Select a player's card to
                          inspect their full profile. Balanced training spreads
                          growth across all 12 attributes. Players start with
                          15–40 attributes and can develop beyond that range.
                        </p>
                      </section>
                      <section className="panel feature-panel">
                        <Leaf size={28} />
                        <h3>Recovery is part of the plan.</h3>
                        <p>
                          Low energy reduces tournament performance. Balanced
                          training slowly restores energy while specialized
                          practice spends it. A physical therapist adds 8
                          recovery every week. Happiness sessions focus on morale
                          with the same recovery as balanced training. Attribute
                          gains cap at 99; playstyle gains cap at 10. Intensity
                          and weekly hours scale development, including playstyle
                          comfort and happiness sessions. Coaches boost attribute
                          training. Contract hours and protected rest days limit
                          the weekly schedule. Ten effective practice hours
                          maintain skills; less practice causes up to 0.2 points
                          of decay per attribute each week. Rest restores energy
                          but still allows this gradual decay. Below 40 energy,
                          development slows. Other clubs train and rest too.
                        </p>
                        <button
                          className="text-link"
                          onClick={() => go("staff")}
                        >
                          Meet available staff <ArrowRight size={15} />
                        </button>
                      </section>
                    </div>
                  </>
                )}
                {page === "inbox" && <ManagerInbox campaign={campaign} onChange={setCampaign} onAction={inboxAction} />}
                {page === "calendar" && (campaign.calendar ? <HistoricalCalendar campaign={campaign} onChange={setCampaign} onHistory={setViewResult} focusEventId={calendarTarget} focusRequest={calendarRequest} onBusyChange={setCalendarBusy} /> : (
                  <>
                    <section className="panel calendar-board">
                      <div className="eyebrow">DATED TOURNAMENT CALENDAR</div>
                      <h2>Bring this campaign onto real event dates.</h2>
                      <p className="field-note">This save uses the original 18-week schedule. Switch to the dated calendar to see full tournament durations, claim invitations and play linked qualifiers. Your roster, cash, player terms and past results stay with the club. The competition clock restarts at this year's historical opening date; old circuit points and qualification are replaced by event-specific entry rules.</p>
                      <button className="button primary" onClick={() => setCampaign(syncOffice(enableHistoricalCalendar(campaign)))}>Use dated tournament calendar <CalendarDays size={16} /></button>
                    </section>
                    <div className="qualification-banner">
                      <Trophy size={27} />
                      <div>
                        <strong>
                          {campaign.qualified
                            ? "Your place at The International is secured."
                            : "Two paths. One destination."}
                        </strong>
                        <p>
                          Earn 80 circuit points or win the Regional Qualifier.
                          TI qualification is never guaranteed.
                        </p>
                      </div>
                      <Badge tone={campaign.qualified ? "green" : "gold"}>
                        {campaign.qualified
                          ? "QUALIFIED"
                          : `${campaign.points} / 80 POINTS`}
                      </Badge>
                    </div>
                    <section className="panel calendar-panel">
                      <SectionTitle
                        title={`${campaign.year} competitive season`}
                        sub="A compact 18-week prototype season. Advance past an event to skip it."
                      />
                      <div className="timeline">
                        {events.map((e) => {
                          const r = eventResult(campaign, e.id);
                          const past = e.week < campaign.week;
                          const locked = e.kind === "ti" && !campaign.qualified;
                          return (
                            <div
                              className={`timeline-event ${r || past ? "past" : ""} ${e.kind === "ti" ? "ti-event" : ""}`}
                              key={e.id}
                            >
                              <div className="timeline-week">
                                <span>WEEK</span>
                                <strong>
                                  {String(e.week).padStart(2, "0")}
                                </strong>
                              </div>
                              <div className="timeline-dot">
                                <Trophy size={18} />
                              </div>
                              <div className="timeline-info">
                                <div>
                                  <h3>{e.name}</h3>
                                  <Badge tone={e.kind === "ti" ? "gold" : ""}>
                                    {e.tier}
                                  </Badge>
                                </div>
                                <p>
                                  {e.location} <span>·</span> {money(e.prize)}{" "}
                                  winner's prize{" "}
                                  {e.points > 0 && (
                                    <>
                                      <span>·</span> {e.points} winner's points
                                    </>
                                  )}
                                </p>
                              </div>
                              <div className="timeline-action">
                                {r ? (
                                  <Badge
                                    tone={
                                      r.skipped ? "" : r.won ? "green" : "red"
                                    }
                                  >
                                    {r.skipped
                                      ? "SKIPPED"
                                      : r.won
                                        ? `WON · ${r.score}`
                                        : `LOST · ${r.score}`}
                                  </Badge>
                                ) : past ? (
                                  <Badge>CONCLUDED</Badge>
                                ) : (
                                  <button
                                    className={`button ${e.kind === "ti" ? "primary" : "secondary"} small-button`}
                                    disabled={locked}
                                    onClick={() => openEvent(e)}
                                  >
                                    {locked ? "Qualify first" : "Enter event"}
                                    {!locked && <ArrowRight size={14} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                    <div className="muted-callout">
                      <CalendarDays size={20} />
                      <p>
                        <strong>You choose the schedule.</strong> Entering a
                        later event advances time and skips earlier unplayed
                        events. Wages, sponsors, training, and recovery resolve
                        for every elapsed week. Watch accelerated lane combat,
                        or skip straight to the same series result.
                      </p>
                    </div>
                  </>
                ))}
                {page === "patch" && <PatchMeta key={patchTarget ?? "current"} initialPatchId={patchTarget} campaign={campaign} onStaff={() => go("staff")} onPlayer={id => setPlayer(campaign.players.find(p => p.id === id) ?? null)} />}
                {page === "world" && <WorldTeams campaign={campaign} onPlayer={setPlayer} />}
                {page === "scouting" && (
                  <>
                    <div className="filter-bar">
                      <div className="search-field">
                        <Search size={17} />
                        <input
                          aria-label="Search players"
                          placeholder="Search players, aliases, teams…"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        />
                      </div>
                      <select
                        aria-label="Filter by role"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        {["All roles", ...ROLES].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <span>
                        {campaign.players.filter(matchesScout).length} of{" "}
                        {
                          campaign.players.filter(
                            (p) => !campaign.roster.includes(p.id),
                          ).length
                        }{" "}
                        players
                      </span>
                    </div>
                    <section className="panel">
                      <SectionTitle
                        title="The transfer market"
                        sub="Recruit a player in your starter's position. Other clubs seek available regional replacements."
                      />
                      <div className="scouting-list">
                        {campaign.players
                          .filter(matchesScout)
                          .map((p) => (
                            <div className="scout-row" key={p.id}>
                              <button
                                className="player-cell plain-button"
                                onClick={() => setPlayer(p)}
                              >
                                <Avatar player={p} small />
                                <span>
                                  <strong>{p.name}</strong>
                                  <small>
                                    {playerTeam(campaign, p.id)} · {p.region}
                                  </small>
                                </span>
                              </button>
                              <Badge>{p.role}</Badge>
                              <span className="scout-rating">
                                <strong>{rating(p)}</strong>
                                <small>OVERALL</small>
                              </span>
                              <span className="scout-price">
                                <strong>{money(p.fee)}</strong>
                                <small>{money(p.wage)} / week</small>
                              </span>
                              <button
                                className="button secondary small-button"
                                onClick={() => setPlayer(p)}
                              >
                                View player <ArrowUpRight size={14} />
                              </button>
                            </div>
                          ))}
                        {!campaign.players.some(matchesScout) && (
                          <div className="empty-state">
                            <Search size={28} />
                            <h3>No players found.</h3>
                            <p>Try another role or search term.</p>
                            <button
                              className="text-link"
                              onClick={() => {
                                setFilter("");
                                setRoleFilter("All roles");
                              }}
                            >
                              Clear filters
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
                {page === "staff" && <StaffOffice campaign={campaign} onPatch={() => go("patch")}
                  onHire={id => { update(c => hireStaff(c, id)); notify("Staff hired. Your patch report has been updated."); }}
                  onDismiss={id => { update(c => dismissStaff(c, id)); notify("Staff released. Research coverage and future payroll updated."); }} />}
                {page === "finances" && (
                  <>
                    <div className="metrics-grid financial-metrics">
                      {[
                        {
                          label: "Available balance",
                          value: money(campaign.cash),
                          icon: Wallet,
                        },
                        {
                          label: "Weekly sponsorship",
                          value: money(weeklyIncome(campaign)),
                          icon: ArrowDownLeft,
                        },
                        {
                          label: "Weekly payroll",
                          value: money(weeklyWages(campaign)),
                          icon: ArrowUpRight,
                        },
                        {
                          label: "Weekly net",
                          value: money(
                            weeklyIncome(campaign) - weeklyWages(campaign),
                          ),
                          icon: TrendingUp,
                        },
                      ].map((m) => (
                        <div className="panel metric" key={m.label}>
                          <div>
                            <span>{m.label}</span>
                            <Icon icon={m.icon} />
                          </div>
                          <strong>{m.value}</strong>
                          <small>
                            {m.label === "Weekly payroll"
                              ? "Active players and support staff"
                              : "USD · prototype economy"}
                          </small>
                        </div>
                      ))}
                    </div>
                    <SponsorMarket campaign={campaign} onChange={(c) => update(() => c)} />
                    <section className="panel transaction-panel">
                      <SectionTitle
                        title="The ledger"
                        sub="Every transfer, every payday, every prize."
                      />
                      {campaign.transactions.length ? (
                        <div className="transactions">
                          {campaign.transactions.slice(0, 12).map((t, i) => (
                            <div key={i}>
                              <div
                                className={`transaction-icon ${t.amount > 0 ? "moss" : "clay"}`}
                              >
                                {t.amount > 0 ? (
                                  <ArrowDownLeft size={16} />
                                ) : (
                                  <ArrowUpRight size={16} />
                                )}
                              </div>
                              <strong>{t.label}</strong>
                              <span>
                                {t.year} · Week {t.week}
                              </span>
                              <strong
                                className={t.amount > 0 ? "positive" : ""}
                              >
                                {t.amount > 0 ? "+" : "−"}
                                {money(Math.abs(t.amount))}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-inline">
                          <Wallet size={22} />
                          <p>
                            Your books are open. Sign a sponsor or advance a
                            week to record your first transaction.
                          </p>
                        </div>
                      )}
                    </section>
                  </>
                )}
                {page === "history" && (
                  <>
                    <div className="metrics-grid">
                      <div className="panel metric">
                        <div>
                          <span>Tournaments entered</span>
                          <Trophy size={18} />
                        </div>
                        <strong>
                          {campaign.results.filter((r) => !r.skipped).length}
                        </strong>
                        <small>Your career so far</small>
                      </div>
                      <div className="panel metric">
                        <div>
                          <span>Tournament victories</span>
                          <Swords size={18} />
                        </div>
                        <strong>
                          {campaign.results.filter((r) => r.won).length}
                        </strong>
                        <small>Every win earned</small>
                      </div>
                      <div className="panel metric">
                        <div>
                          <span>Prize earnings</span>
                          <Coins size={18} />
                        </div>
                        <strong>
                          {shortMoney(
                            campaign.results.reduce(
                              (sum, r) => sum + r.prize,
                              0,
                            ),
                          )}
                        </strong>
                        <small>Across all seasons</small>
                      </div>
                      <div className="panel metric">
                        <div>
                          <span>Aegises lifted</span>
                          <Shield size={18} />
                        </div>
                        <strong>
                          {
                            campaign.results.filter(
                              (r) => r.eventId === "ti" && r.won,
                            ).length
                          }
                        </strong>
                        <small>The ultimate achievement</small>
                      </div>
                    </div>
                    <section className="panel">
                      <SectionTitle
                        title="Your competitive record"
                        sub="An alternate history, written one result at a time."
                      />
                      {campaign.results.length ? (
                        <div className="results-list">
                          {[...campaign.results].reverse().map((r, i) => (
                            <div key={i}>
                              <span
                                className={`result-mark ${r.skipped ? "neutral" : r.won ? "win" : "loss"}`}
                              >
                                {r.skipped ? "—" : r.won ? "W" : "L"}
                              </span>
                              <div>
                                <strong>{r.event}</strong>
                                <small>
                                  {r.year} · Week {r.week} ·{" "}
                                  {r.skipped
                                    ? "Did not participate"
                                    : `vs ${r.opponent}`}
                                </small>
                              </div>
                              <strong>{r.score}</strong>
                              <span>{r.points} pts</span>
                              <strong>{money(r.prize)}</strong>
                              {!r.skipped && (
                                <button
                                  className="text-link result-details-link"
                                  onClick={() => setViewResult(r)}
                                >
                                  Details <ArrowUpRight size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <Trophy size={42} strokeWidth={1} />
                          <h3>The trophy cabinet is waiting.</h3>
                          <p>
                            Your first tournament is the first page of your
                            story.
                          </p>
                          <button
                            className="button primary"
                            onClick={() => go("calendar")}
                          >
                            Explore the season <ArrowRight size={15} />
                          </button>
                        </div>
                      )}
                    </section>
                  </>
                )}
                <footer className="app-footer">
                  <span>
                    <span className="tiny-square" /> AEGIS MANAGER
                  </span>
                  <span>
                    {campaign.world ? "2011–2026 rosters · Estimated gameplay ratings" : "Legacy fictional world"} ·{" "}
                    {campaign.settings.difficulty} difficulty
                  </span>
                  <button onClick={newCampaign}>
                    New campaign <Plus size={13} />
                  </button>
                </footer>
              </>
            )
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !simulating) {
              setPlayer(null);
              setViewResult(null);
              setEvent(null);
              setHelp(false);
              setPreferences(false);
              setConfirmNew(false);
            }
          }}
        >
          <div
            className={`modal ${currentPlayer ? "profile-modal" : viewResult || (event && (pendingSimulation || simDone)) ? "match-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            ref={modalRef}
          >
            {!simulating && (
              <button
                className="modal-close icon-button"
                aria-label="Close dialog"
                onClick={() => {
                  setPlayer(null);
                  setViewResult(null);
                  setEvent(null);
                  setHelp(false);
                  setPreferences(false);
                  setConfirmNew(false);
                }}
              >
                <X size={20} />
              </button>
            )}
            {currentPlayer && campaign && (
              <>
                <div className={`profile-heading ${currentPlayer.color}`}>
                  <Avatar player={currentPlayer} />
                  <div>
                    <Badge>{currentPlayer.role}</Badge>
                    <h2 id="modal-title">{currentPlayer.name}</h2>
                    <p>
                      {currentPlayer.historical ? `${playerTeam(campaign, currentPlayer.id)} · ${currentPlayer.region}` : `${currentPlayer.firstName} ${currentPlayer.lastName} · ${currentPlayer.age} years · ${currentPlayer.region}`}
                    </p>
                  </div>
                  <div className="profile-overall">
                    {rating(currentPlayer)}
                    <small>OVERALL</small>
                  </div>
                </div>
                <div className="profile-body">
                  <PortraitCredit playerId={currentPlayer.id} />
                  {currentPlayer.historical && <div className="historical-provenance">
                    <p>Historical reference: {currentPlayer.historical.team} · {currentPlayer.historical.date}. <a className="text-link" href={sourceFor(currentPlayer.historical.source)?.url} target="_blank" rel="noreferrer">Source ↗</a></p>
                    <p>Reference role: {currentPlayer.historical.role} (adapted). Current role: {currentPlayer.role}. Ratings, playstyles, wages and fees are gameplay estimates. Full name and age are pending research.</p>
                    {!!currentPlayer.historical.aliases.length && <p>Also known as: {currentPlayer.historical.aliases.join(", ")}</p>}
                  </div>}
                  <div className="profile-vitals">
                    <span>
                      <Zap size={15} /> {currentPlayer.energy}% energy
                    </span>
                    <span>
                      <Heart size={15} /> {currentPlayer.happiness}% happiness
                    </span>
                    <span>
                      <Wallet size={15} /> {money(currentPlayer.wage)} / wk
                    </span>
                  </div>
                  <PlayerProfileTabs key={currentPlayer.id} campaign={campaign} playerId={currentPlayer.id}>
                  <ContractNegotiation key={currentPlayer.id} campaign={campaign} player={currentPlayer} onChange={(next) => update(() => next)} />
                  <PlayerTalents campaign={campaign} playerId={currentPlayer.id} onChange={next => update(() => next)} />
                  <SectionTitle
                    title="Player attributes"
                    sub="Execution and potential · 0–100"
                  />
                  <div className="profile-stats">
                    {Object.entries(currentPlayer.stats).map(([key, v]) => (
                      <div key={key}>
                        <span>
                          {statNames[key]}
                          <strong>{v}</strong>
                        </span>
                        <Meter value={v} tone={v >= 85 ? "" : "gold"} />
                      </div>
                    ))}
                  </div>
                  <SectionTitle
                    title="Playstyle identity"
                    sub="Comfort and tendencies · 1–10"
                  />
                  <div className="playstyle-list">
                    {Object.entries(currentPlayer.playstyles)
                      .filter(([, value]) => value != null)
                      .map(([key, value]) => (
                        <div key={key}>
                          <span>{key}</span>
                          <div className="style-blocks">
                            {Array.from({ length: 10 }, (_, i) => (
                              <span
                                key={i}
                              >
                                <span style={{ width: `${Math.max(0, Math.min(1, value! - i)) * 100}%` }} />
                              </span>
                            ))}
                          </div>
                          <strong>{value}</strong>
                        </div>
                      ))}
                  </div>
                  </PlayerProfileTabs>
                </div>
              </>
            )}
            {viewResult?.tournamentId && campaign ? <TournamentHistory campaign={campaign} eventId={viewResult.tournamentId} onClose={() => setViewResult(null)} /> : viewResult && (
              <SeriesResults
                result={viewResult}
                managedTeamId={campaign?.world?.managedTeamId}
                onClose={() => setViewResult(null)}
              />
            )}
            {event &&
              campaign &&
              (simDone && activeEventResult ? (
                <SeriesResults
                  result={activeEventResult}
                  managedTeamId={campaign.world?.managedTeamId}
                  onClose={() => {
                    setEvent(null);
                    go("history");
                  }}
                />
              ) : pendingSimulation ? (
                <MatchViewer
                  simulation={pendingSimulation}
                  year={campaign.year}
                  managedTeamId={campaign.world?.managedTeamId}
                  onFinish={() => finishSimulation(pendingSimulation)}
                />
              ) : simulating || workerError ? (
                <ComputingMatch
                  progress={progress}
                  error={workerError}
                  onSkip={() => {
                    skipRequested.current = true;
                    notify(
                      "Playback will be skipped. Waiting for the lane engine to finish.",
                    );
                  }}
                  onCancel={() => {
                    setWorkerError("");
                    setEvent(null);
                  }}
                />
              ) : (
                <div className="simulation-content">
                  <div className="event-emblem large">
                    <Trophy size={33} />
                  </div>
                  <div className="eyebrow">
                    {event.tier} · WEEK {event.week}
                  </div>
                  <h2 id="modal-title">{event.name}</h2>
                  <p>
                    One event-deciding series. Three lanes. A place in your
                    season's story.
                  </p>
                  <div className="sim-matchup">
                    <TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} />
                    <strong>{campaign.settings.team}</strong>
                    <span>VS</span>
                    <strong>
                      {opponentFor(prepareEvent(campaign, event))}
                    </strong>
                    <TeamBadge teamId={campaign.world ? teamIdForName(opponentFor(prepareEvent(campaign, event)), campaign.year) : undefined} name={opponentFor(prepareEvent(campaign, event))} year={campaign.year} />
                  </div>
                  <div className="sim-rewards">
                    <div>
                      <strong>{money(event.prize)}</strong>
                      <span>Winner's prize</span>
                    </div>
                    <div>
                      <strong>{event.points || "The Aegis"}</strong>
                      <span>
                        {event.points ? "Winner's points" : "Championship"}
                      </span>
                    </div>
                  </div>
                  <div className="sim-note">
                    <CircleHelp size={16} />
                    <p>
                      {event.week > campaign.week
                        ? `Advances ${event.week - campaign.week} weeks to the event, then one recovery week. Earlier unplayed events will be skipped. `
                        : "Uses this week, then advances one recovery week. "}
                      The lane engine decides a best-of-three series. Watch
                      accelerated playback or skip straight to the same results.
                      Payroll and training resolve each elapsed week.
                    </p>
                  </div>
                  <button
                    className="button primary full"
                    onClick={runSimulation}
                  >
                    Simulate & watch{" "}
                    <span className="button-time">BEST OF 3</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              ))}
            {help && (
              <div className="text-modal">
                <div className="eyebrow">THE MANAGER'S HANDBOOK</div>
                <h2 id="modal-title">
                  A little direction. A lot of possibility.
                </h2>
                <p>
                  Your first goal: reach The International. Earn 80 circuit
                  points or win your regional qualifier. You may miss TI
                  entirely.
                </p>
                <div className="handbook-item">
                  <Users size={21} />
                  <div>
                    <h3>Build your five</h3>
                    <p>
                      Explore profiles, compare attributes and playstyles, and
                      negotiate with players from your squad, the market or other clubs. Pay, bonuses, contract length, prize share, practice hours and rest days all form the deal. Clubs fill vacancies from available regional players.
                    </p>
                  </div>
                </div>
                <div className="handbook-item">
                  <Crosshair size={21} />
                  <div>
                    <h3>Balance practice and recovery</h3>
                    <p>
                      Choose an individual training plan. Advance a week to
                      develop skills, restore energy, and settle wages.
                    </p>
                  </div>
                </div>
                <div className="handbook-item">
                  <CalendarDays size={21} />
                  <div>
                    <h3>Choose your tournaments</h3>
                    <p>
                      Entering an event advances time. Skip an event by
                      advancing past its week. Watch a lane-engine series, or
                      skip playback for the same result.
                    </p>
                  </div>
                </div>
                <div className="handbook-item">
                  <Wallet size={21} />
                  <div>
                    <h3>Fund the next chapter</h3>
                    <p>
                      Sign a sponsor for a bonus and weekly income. Reputation
                      unlocks better partners. Negative cash reduces happiness.
                    </p>
                  </div>
                </div>
                <div className="alert">
                  Historical player and hero batches cover 2011–2026 and enter at annual post-TI shuffles. Later starts use completed prior shuffles. Regional coverage includes closed qualifier teams; it is not an exhaustive player census. Recruitment changes opponent lineups. Signature heroes, detailed drafting, tactical orders and bootcamps remain future work. Two composite patches per TI season now change drafting and lane combat; their balance values are estimates. Gameplay ratings and the event calendar are estimates.
                </div>
              </div>
            )}
            {preferences && (
              <div className="text-modal">
                <div className="eyebrow">YOUR WORKSPACE</div>
                <h2 id="modal-title">Organization settings</h2>
                <p>
                  {campaign
                    ? `${campaign.settings.team} · ${campaign.settings.region} · ${campaign.settings.difficulty} difficulty`
                    : "Create a campaign to begin your story."}
                </p>
                <div className="settings-row">
                  <span>Appearance</span>
                  <div
                    className="theme-options"
                    role="group"
                    aria-label="Appearance"
                  >
                    <button
                      aria-pressed={theme === "light"}
                      onClick={() => setTheme("light")}
                    >
                      <Sun size={14} /> Light
                    </button>
                    <button
                      aria-pressed={theme === "dark"}
                      onClick={() => setTheme("dark")}
                    >
                      <Moon size={14} /> Dark
                    </button>
                  </div>
                </div>
                {identitySettings && (!setup || settings.clubMode === "custom") && <ClubBrandingEditor value={clubBranding}
                  name={identitySettings.team} teamId={identityTeamId} year={setup ? settings.year : campaign?.year ?? 2011}
                  onChange={branding => { if (setup) setSettings(current => ({ ...current, branding }));
                    else update(current => ({ ...current, settings: { ...current.settings, branding } })); }} />}
                <div className="settings-row">
                  <span>Game data</span>
                  <Badge tone="gold">{campaign?.world ? "2011–2026 ROSTERS · ESTIMATED RATINGS" : "LEGACY PLACEHOLDERS"}</Badge>
                </div>
                <div className="settings-row">
                  <span>Save location</span>
                  <strong>This browser only</strong>
                </div>
                <div className="settings-row">
                  <span>Autosave</span>
                  <strong>
                    {saveError ? "Storage unavailable" : "After every decision"}
                  </strong>
                </div>
                <div className="settings-row">
                  <span>Season length</span>
                  <strong>18 weeks · prototype</strong>
                </div>
                <p className="field-note">
                  Starting a replacement campaign will ask before overwriting
                  your current save. No account or server is required.
                </p>
                <button className="button primary full" onClick={newCampaign}>
                  Set up a new campaign <Plus size={16} />
                </button>
              </div>
            )}
            {confirmNew && (
              <div className="text-modal">
                <div className="eyebrow">A NEW BEGINNING</div>
                <h2 id="modal-title">Replace your current campaign?</h2>
                <p>
                  Starting {setupName} in {settings.year} will replace the
                  saved campaign for {campaign?.settings.team}. This prototype
                  has one local save slot.
                </p>
                <div className="dialog-actions">
                  <button
                    className="button secondary"
                    onClick={() => setConfirmNew(false)}
                  >
                    Keep current save
                  </button>
                  <button className="button primary" onClick={start}>
                    Start new campaign <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </ClubIdentityContext.Provider>
  );
}
