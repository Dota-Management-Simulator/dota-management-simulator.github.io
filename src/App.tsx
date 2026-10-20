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
  Waves,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  advanceWeek,
  average,
  createCampaign,
  data,
  DEFAULT_SETTINGS,
  eventResult,
  events,
  hireStaff,
  money,
  nextEvent,
  rating,
  readSave,
  ROLES,
  SAVE_KEY,
  shortMoney,
  signPlayer,
  signSponsor,
  buildBattleConfig,
  prepareEvent,
  settleEvent,
  opponentFor,
  statNames,
  teamPlayers,
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
import HeroPool from "./HeroPool";

const navigation: {
  page: Page;
  label: string;
  icon: LucideIcon;
  group?: string;
}[] = [
  {
    page: "overview",
    label: "Headquarters",
    icon: LayoutDashboard,
    group: "YOUR ORGANIZATION",
  },
  { page: "roster", label: "Roster", icon: Users },
  { page: "training", label: "Training", icon: Crosshair },
  { page: "scouting", label: "Scouting", icon: Search },
  { page: "staff", label: "Staff", icon: UserRound },
  {
    page: "calendar",
    label: "Season calendar",
    icon: CalendarDays,
    group: "THE COMPETITION",
  },
  { page: "patch", label: "Patch & meta", icon: Sparkles },
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
      "A new perspective can change everything. Explore the free-agent pool.",
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
      "Chase circuit points, build momentum, or take a week to reset.",
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
function Avatar({
  player,
  small = false,
}: {
  player: Player;
  small?: boolean;
}) {
  return (
    <div className={`avatar ${player.color} ${small ? "small" : ""}`}>
      <span>{player.name.slice(0, 1)}</span>
      <div className="avatar-shape" />
    </div>
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
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const workerRef = useRef<Worker | null>(null);
  const skipRequested = useRef(false);
  const settled = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const notify = (message: string) => setToast(message);
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
          'button:not([disabled]), input, select, [tabindex="0"]',
        ) || [],
      );
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
    setPage(p);
    setMobileMenu(false);
    setFilter("");
    setRoleFilter("All roles");
    window.scrollTo(0, 0);
  };
  const update = (f: (c: Campaign) => Campaign) =>
    setCampaign((c) => (c ? f(c) : c));
  const start = () => {
    setCampaign(createCampaign(settings));
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
    update(advanceWeek);
    notify("A week completed. Training, recovery, and finances updated.");
  };
  const roster = campaign ? teamPlayers(campaign) : [];
  const currentPlayer =
    player && campaign
      ? campaign.players.find((p) => p.id === player.id)!
      : null;
  const upcoming = campaign ? nextEvent(campaign) : null;
  const activeEventResult =
    campaign && event ? eventResult(campaign, event.id) : null;

  return (
    <div className="app-shell">
      {mobileMenu && (
        <div className="nav-scrim" onClick={() => setMobileMenu(false)} />
      )}
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
          <div className="org-mark">
            <Shield size={19} />
          </div>
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
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {setup
                ? "New campaign"
                : navigation.find((n) => n.page === page)?.label}
            </strong>
          </div>
          <div className="topbar-actions">
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
              aria-label="Campaign settings"
              onClick={() => setPreferences(true)}
            >
              <Settings2 size={18} />
            </button>
            <div className="manager-avatar">GM</div>
          </div>
        </header>
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
                        Team name
                        <input
                          maxLength={32}
                          value={settings.team}
                          onChange={(e) =>
                            setSettings({ ...settings, team: e.target.value })
                          }
                          placeholder="Name your organization"
                        />
                      </label>
                      <label>
                        Home region
                        <div className="select-wrap">
                          <Globe2 size={16} />
                          <select
                            value={settings.region}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                region: e.target.value,
                              })
                            }
                          >
                            {[
                              "Europe",
                              "North America",
                              "South America",
                              "China",
                              "Southeast Asia",
                              "Eastern Europe",
                            ].map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </label>
                    </div>
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
                                ? "GENERATED ERA"
                                : "SANDBOX ERA"}
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
                          {Array.from({ length: 26 }, (_, i) => 2011 + i).map(
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
                          disabled={settings.year >= 2036}
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
                      <span>2011 — 2036</span>
                    </div>
                    <p className="field-note">
                      All eras currently use fictional players, events, and
                      patch values. Historical data comes later.
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
                      disabled={!settings.team.trim()}
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
                    <h3>{settings.team.trim() || "Your organization"}</h3>
                    <div className="preview-row">
                      <span>First season</span>
                      <strong>
                        {settings.year}
                        {settings.year === 2011 && " · Classic"}
                      </strong>
                    </div>
                    <div className="preview-row">
                      <span>Home region</span>
                      <strong>{settings.region}</strong>
                    </div>
                    <div className="preview-row">
                      <span>Difficulty</span>
                      <strong>{settings.difficulty}</strong>
                    </div>
                    <div className="preview-row">
                      <span>Starting roster</span>
                      <strong>5 fictional players</strong>
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
                <span>Real decisions. Placeholder world. Room to grow.</span>
              </div>
            </>
          ) : (
            campaign && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">{pageText[page].eyebrow}</div>
                    <h1>{pageText[page].title}</h1>
                    <p>{pageText[page].description}</p>
                  </div>
                  <div className="heading-actions">
                    <div className="season-pill">
                      <CalendarDays size={15} />
                      {campaign.year}
                      <span>WEEK {campaign.week}</span>
                    </div>
                    <button className="button primary" onClick={advance}>
                      Advance week <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
                {campaign.cash < 0 && (
                  <div className="alert warning">
                    Your balance is below zero. Unpaid payroll reduces player
                    happiness each week. Sign a sponsor or pursue tournament
                    earnings.
                  </div>
                )}
                {page === "overview" && (
                  <>
                    <div className="overview-top">
                      <div className="season-hero">
                        <div className="art-grid" />
                        <div className="hero-copy">
                          <Badge tone="dark">
                            {campaign.year === 2011
                              ? "THE CLASSIC ERA"
                              : "YOUR NEXT CHAPTER"}{" "}
                            · SEASON {campaign.year}
                          </Badge>
                          <h2>
                            The road to glory
                            <br />
                            starts with <em>you.</em>
                          </h2>
                          <p>
                            Build your five. Find your edge.
                            <br />
                            Make this season one to remember.
                          </p>
                          <button
                            className="button cream"
                            onClick={() => go("calendar")}
                          >
                            Plan your season <ArrowRight size={16} />
                          </button>
                        </div>
                        <Aegis className="dashboard-aegis" />
                        <span className="hero-watermark">
                          ONE TEAM. ONE AEGIS.
                        </span>
                      </div>
                      <div className="panel qualification">
                        <div className="eyebrow">
                          <Trophy size={15} /> THE INTERNATIONAL
                        </div>
                        <h3>
                          {campaign.qualified
                            ? "You're going to TI."
                            : "An invitation to earn."}
                        </h3>
                        <p>
                          {campaign.qualified
                            ? "Your place on the biggest stage is secured. Prepare your team."
                            : "Make your mark on the circuit, or win your regional qualifier."}
                        </p>
                        <div className="points-line">
                          <strong>
                            {campaign.points}
                            <small> / 80 pts</small>
                          </strong>
                          <Badge tone={campaign.qualified ? "green" : ""}>
                            {campaign.qualified ? "QUALIFIED" : "NOT QUALIFIED"}
                          </Badge>
                        </div>
                        <Meter
                          value={Math.min(100, (campaign.points / 80) * 100)}
                        />
                        <button
                          className="text-link"
                          onClick={() => go("calendar")}
                        >
                          View qualification path <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="metrics-grid">
                      {[
                        {
                          label: "Club balance",
                          value: shortMoney(campaign.cash),
                          sub: `${shortMoney(weeklyIncome(campaign) - weeklyWages(campaign))} net / week`,
                          icon: Wallet,
                          tone: "sand",
                        },
                        {
                          label: "Team readiness",
                          value: `${average(roster.map((p) => p.energy))}%`,
                          sub: "Energy across your starting five",
                          icon: Zap,
                          tone: "moss",
                        },
                        {
                          label: "Team morale",
                          value: `${average(roster.map((p) => p.happiness))}%`,
                          sub: "A happy team plays together",
                          icon: Heart,
                          tone: "clay",
                        },
                        {
                          label: "Reputation",
                          value: `${campaign.reputation}`,
                          sub: "Opens doors to better sponsors",
                          icon: TrendingUp,
                          tone: "lilac",
                        },
                      ].map((m) => (
                        <div className="panel metric" key={m.label}>
                          <div>
                            <span>{m.label}</span>
                            <span className={`metric-icon ${m.tone}`}>
                              <Icon icon={m.icon} />
                            </span>
                          </div>
                          <strong>{m.value}</strong>
                          <small>{m.sub}</small>
                        </div>
                      ))}
                    </div>
                    <div className="overview-bottom">
                      <section className="panel">
                        <SectionTitle
                          title="Your starting five"
                          sub="The people behind the ambition."
                          action={
                            <button
                              className="text-link"
                              onClick={() => go("roster")}
                            >
                              Manage roster <ArrowRight size={15} />
                            </button>
                          }
                        />
                        <div className="mini-roster">
                          {roster.map((p, i) => (
                            <button
                              className="mini-player"
                              key={p.id}
                              onClick={() => setPlayer(p)}
                            >
                              <span className="position-number">0{i + 1}</span>
                              <Avatar player={p} small />
                              <div>
                                <strong>{p.name}</strong>
                                <small>{p.role}</small>
                              </div>
                              <span className="mini-energy">
                                <Meter value={p.energy} />
                              </span>
                              <strong className="rating-value">
                                {rating(p)}
                              </strong>
                              <ChevronRight size={15} />
                            </button>
                          ))}
                        </div>
                      </section>
                      <div className="overview-right">
                        <section className="panel next-event">
                          <div className="eyebrow">NEXT ON THE CALENDAR</div>
                          {upcoming ? (
                            <>
                              <div className="event-emblem">
                                <Trophy size={26} />
                              </div>
                              <Badge>{upcoming.tier}</Badge>
                              <h3>{upcoming.name}</h3>
                              <p>
                                Week {upcoming.week} · {upcoming.location}
                              </p>
                              <div className="event-rewards">
                                <span>
                                  <Coins size={15} />
                                  {shortMoney(upcoming.prize)} prize
                                </span>
                                <span>
                                  <Target size={15} />
                                  {upcoming.points
                                    ? `${upcoming.points} pts`
                                    : "The Aegis"}
                                </span>
                              </div>
                              <button
                                className="button secondary full"
                                disabled={
                                  upcoming.kind === "ti" && !campaign.qualified
                                }
                                onClick={() => openEvent(upcoming)}
                              >
                                {upcoming.kind === "ti" && !campaign.qualified
                                  ? "Qualification required"
                                  : "Enter tournament"}
                                <ArrowRight size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              <h3>The season is winding down.</h3>
                              <p>
                                Rest, review, and advance to week 19 to begin a
                                new year.
                              </p>
                              <button
                                className="button secondary full"
                                onClick={advance}
                              >
                                Advance week <ArrowRight size={15} />
                              </button>
                            </>
                          )}
                        </section>
                        <button
                          className="patch-teaser"
                          onClick={() => go("patch")}
                        >
                          <span className="metric-icon moss">
                            <Sparkles size={20} />
                          </span>
                          <div>
                            <small>LIVE PATCH · {data.patch.version}</small>
                            <strong>{data.patch.name}</strong>
                          </div>
                          <ArrowUpRight size={19} />
                        </button>
                      </div>
                    </div>
                    <section className="panel activity">
                      <SectionTitle title="Around the organization" />
                      <div className="activity-items">
                        {campaign.log.slice(0, 3).map((l, i) => (
                          <div key={`${l}-${i}`}>
                            <span className="activity-dot" />
                            <p>{l}</p>
                            <small>{i === 0 ? "LATEST" : "RECENT"}</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
                {page === "roster" && (
                  <>
                    <div className="info-strip">
                      <span>
                        <Users size={17} />
                        <strong>5 / 5</strong> starting positions filled
                      </span>
                      <span>
                        <BarChart3 size={17} /> Average rating{" "}
                        <strong>{average(roster.map(rating))}</strong>
                      </span>
                      <button
                        className="text-link"
                        onClick={() => go("scouting")}
                      >
                        Explore free agents <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="player-grid">
                      {roster.map((p, i) => (
                        <article className="panel player-card" key={p.id}>
                          <div className="player-card-top">
                            <span className="eyebrow">POSITION 0{i + 1}</span>
                            <Badge>{p.role}</Badge>
                          </div>
                          <div className={`player-portrait ${p.color}`}>
                            <Avatar player={p} />
                            <span className="portrait-rating">
                              {rating(p)}
                              <small>OVR</small>
                            </span>
                            <div className="portrait-lines" />
                          </div>
                          <div className="player-card-content">
                            <h3>{p.name}</h3>
                            <p>
                              {p.firstName} {p.lastName} <span>· {p.age}</span>
                            </p>
                            <div className="player-vital">
                              <span>
                                Energy<strong>{p.energy}%</strong>
                              </span>
                              <Meter value={p.energy} />
                            </div>
                            <div className="player-vital">
                              <span>
                                Happiness<strong>{p.happiness}%</strong>
                              </span>
                              <Meter value={p.happiness} tone="gold" />
                            </div>
                            <div className="player-card-footer">
                              <span>
                                {money(p.wage)}
                                <small> / week</small>
                              </span>
                              <button
                                className="text-link"
                                onClick={() => setPlayer(p)}
                              >
                                Profile <ArrowUpRight size={15} />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="muted-callout">
                      <Shield size={20} />
                      <p>
                        <strong>A complete squad, a clean slate.</strong> Select
                        a profile to inspect all 12 attributes, happiness,
                        playstyles, and the player's contract. Ratings are
                        fictional, on a 0–100 scale; playstyles use 1–10.
                      </p>
                    </div>
                  </>
                )}
                {page === "training" && (
                  <>
                    <div className="info-strip">
                      <span>
                        <Zap size={17} /> Training resolves when you{" "}
                        <strong>advance a week</strong>
                      </span>
                      <span>
                        Specialized sessions cost 5 energy. Rest restores 24.
                      </span>
                    </div>
                    <section className="panel">
                      <SectionTitle
                        title="The weekly plan"
                        sub="Individual focus. A shared goal."
                        action={
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
                        }
                      />
                      <div className="training-table">
                        <div className="table-head">
                          <span>PLAYER</span>
                          <span>ENERGY</span>
                          <span>TRAINING FOCUS</span>
                          <span>EXPECTED EFFECT</span>
                        </div>
                        {roster.map((p) => (
                          <div className="training-row" key={p.id}>
                            <div className="player-cell">
                              <Avatar player={p} small />
                              <span>
                                <strong>{p.name}</strong>
                                <small>{p.role}</small>
                              </span>
                            </div>
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
                              {[
                                "Balanced",
                                "Laning",
                                "Teamfights",
                                "Map awareness",
                                "Hero pool",
                                "Rest",
                              ].map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                            <small className="training-effect">
                              {campaign.training[p.id] === "Rest"
                                ? "+24 energy · +4 happiness"
                                : campaign.training[p.id] === "Balanced"
                                  ? "+1 stability & stamina · +7 energy"
                                  : "+1 to focus attributes · −5 energy"}
                              {campaign.staffIds.includes("c1") &&
                              campaign.training[p.id] !== "Rest"
                                ? " · coach +1"
                                : ""}
                            </small>
                          </div>
                        ))}
                      </div>
                    </section>
                    <div className="two-col">
                      <section className="panel feature-panel">
                        <Crosshair size={28} />
                        <h3>Train with intention.</h3>
                        <p>
                          Laning improves laning and skirmish. Teamfights
                          improves execution and stability. Map awareness builds
                          vision, intuition, and pushing. Hero pool develops
                          versatility and creativity.
                        </p>
                      </section>
                      <section className="panel feature-panel">
                        <Leaf size={28} />
                        <h3>Recovery is part of the plan.</h3>
                        <p>
                          Low energy reduces tournament performance. Balanced
                          training slowly restores energy while specialized
                          practice spends it. A physical therapist adds 8
                          recovery every week.
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
                {page === "calendar" && (
                  <>
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
                )}
                {page === "patch" && (
                  <>
                    <div className="patch-header panel">
                      <div className="patch-version">{data.patch.version}</div>
                      <div>
                        <Badge tone="green">CURRENT ENVIRONMENT</Badge>
                        <h2>{data.patch.name}</h2>
                        <p>{data.patch.description}</p>
                      </div>
                      <Sparkles className="patch-spark" size={48} />
                    </div>
                    <div className="two-col patch-layout">
                      <section className="panel">
                        <SectionTitle
                          title="What this patch rewards"
                          sub="Seven tuning points for the shape of the game."
                        />
                        <div className="patch-attributes">
                          {data.patch.attributes.map((a) => (
                            <div className="patch-attribute" key={a.key}>
                              <div>
                                <strong>{a.name}</strong>
                                <span>
                                  {a.value}
                                  <small> / 100</small>
                                </span>
                              </div>
                              <Meter value={a.value} tone="gold" />
                              <div className="attribute-scale">
                                <span>{a.low}</span>
                                <span>{a.high}</span>
                              </div>
                              <p>{a.description}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                      <div>
                        <section className="panel">
                          <SectionTitle
                            title="Heroes to watch"
                            sub="Real hero names · placeholder ratings and tags."
                          />
                          <div className="meta-heroes">
                            {data.patch.heroes.map((h) => {
                              const HeroIcon =
                                h.symbol === "flame"
                                  ? Flame
                                  : h.symbol === "tree"
                                    ? Leaf
                                    : h.symbol === "moon"
                                      ? Moon
                                      : h.symbol === "waves"
                                        ? Waves
                                        : Sparkles;
                              return (
                                <div className="meta-hero" key={h.name}>
                                  <div className={`hero-icon ${h.color}`}>
                                    <HeroIcon size={23} />
                                  </div>
                                  <div>
                                    <strong>{h.name}</strong>
                                    <small>
                                      {h.role} · {h.tags.join(" / ")}
                                    </small>
                                  </div>
                                  <span className="meta-strength">
                                    {h.strength}
                                    <small>META</small>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                        <div className="muted-callout vertical">
                          <Sparkles size={23} />
                          <p>
                            <strong>Structure now. Verified data later.</strong>{" "}
                            Patch attributes, hero tags, and meta strength live
                            in a separate data file. They are available for
                            future drafting and simulation. The lane engine
                            currently uses player skills, readiness, morale,
                            difficulty, and analyst preparation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {page === "patch" && <HeroPool year={campaign.year} />}
                {page === "scouting" && (
                  <>
                    <div className="filter-bar">
                      <div className="search-field">
                        <Search size={17} />
                        <input
                          aria-label="Search free agents"
                          placeholder="Search players, regions…"
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
                        {
                          campaign.players.filter(
                            (p) => !campaign.roster.includes(p.id),
                          ).length
                        }{" "}
                        available players
                      </span>
                    </div>
                    <section className="panel">
                      <SectionTitle
                        title="The free-agent pool"
                        sub="Sign a player to replace the current starter in their position."
                      />
                      <div className="scouting-list">
                        {campaign.players
                          .filter(
                            (p) =>
                              !campaign.roster.includes(p.id) &&
                              (roleFilter === "All roles" ||
                                p.role === roleFilter) &&
                              `${p.name} ${p.firstName} ${p.lastName} ${p.region}`
                                .toLowerCase()
                                .includes(filter.toLowerCase()),
                          )
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
                                    {p.age} years · {p.region}
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
                        {!campaign.players.some(
                          (p) =>
                            !campaign.roster.includes(p.id) &&
                            (roleFilter === "All roles" ||
                              p.role === roleFilter) &&
                            `${p.name} ${p.firstName} ${p.lastName} ${p.region}`
                              .toLowerCase()
                              .includes(filter.toLowerCase()),
                        ) && (
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
                {page === "staff" && (
                  <>
                    <div className="info-strip">
                      <span>
                        <Users size={17} />
                        <strong>{campaign.staffIds.length} / 3</strong> support
                        roles filled
                      </span>
                      <span>
                        Staff wages are paid automatically every week.
                      </span>
                    </div>
                    <div className="staff-grid">
                      {data.staff.map((s) => {
                        const hired = campaign.staffIds.includes(s.id);
                        return (
                          <article className="panel staff-card" key={s.id}>
                            <div className={`staff-portrait ${s.color}`}>
                              <UserRound size={48} strokeWidth={1} />
                              <Badge>{s.role}</Badge>
                            </div>
                            <div className="staff-content">
                              <h3>{s.name}</h3>
                              <p>{s.specialty}</p>
                              <div className="staff-benefit">
                                <TrendingUp size={16} />
                                {s.benefit}
                              </div>
                              <div className="staff-price">
                                <strong>{money(s.weekly)}</strong>
                                <span> / week</span>
                              </div>
                              <button
                                disabled={hired || campaign.cash < s.weekly * 4}
                                className={`button ${hired ? "secondary" : "primary"} full`}
                                onClick={() => {
                                  update((c) => hireStaff(c, s.id));
                                  notify(
                                    `${s.name} is now part of your organization.`,
                                  );
                                }}
                              >
                                {hired ? (
                                  <>
                                    <Check size={15} /> On your staff
                                  </>
                                ) : campaign.cash < s.weekly * 4 ? (
                                  "Need four weeks of wages"
                                ) : (
                                  <>
                                    <Plus size={15} /> Hire{" "}
                                    {s.role.toLowerCase()}
                                  </>
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
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
                    <SectionTitle
                      title="Partnership opportunities"
                      sub="Grow your reputation to open new doors. Bonuses are paid on signing."
                    />
                    <div className="sponsor-grid">
                      {data.sponsors.map((s) => {
                        const signed = campaign.sponsorIds.includes(s.id);
                        const eligible = campaign.reputation >= s.requirement;
                        return (
                          <article className="panel sponsor-card" key={s.id}>
                            <div className={`sponsor-brand ${s.color}`}>
                              <span>{s.symbol}</span>
                              <strong>{s.name}</strong>
                            </div>
                            <div className="sponsor-content">
                              <span className="eyebrow">{s.category}</span>
                              <p>{s.description}</p>
                              <div className="sponsor-offer">
                                <strong>
                                  {money(s.weekly)}
                                  <small> / week</small>
                                </strong>
                                <span>+ {money(s.bonus)} signing bonus</span>
                              </div>
                              <div className="sponsor-requirement">
                                <Target size={14} />
                                {s.requirement
                                  ? `${s.requirement} reputation required · you have ${campaign.reputation}`
                                  : "Open to emerging organizations"}
                              </div>
                              <button
                                className={`button ${signed ? "secondary" : "primary"} full`}
                                disabled={signed || !eligible}
                                onClick={() => {
                                  update((c) => signSponsor(c, s.id));
                                  notify(
                                    `${s.name} signed. Bonus added to your balance.`,
                                  );
                                }}
                              >
                                {signed ? (
                                  <>
                                    <Check size={15} /> Active partnership
                                  </>
                                ) : eligible ? (
                                  <>
                                    Sign partnership <ArrowRight size={15} />
                                  </>
                                ) : (
                                  "Build your reputation"
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
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
                    Fictional world data · Local prototype ·{" "}
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
                      {currentPlayer.firstName} {currentPlayer.lastName} ·{" "}
                      {currentPlayer.age} years · {currentPlayer.region}
                    </p>
                  </div>
                  <div className="profile-overall">
                    {rating(currentPlayer)}
                    <small>OVERALL</small>
                  </div>
                </div>
                <div className="profile-body">
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
                                className={i < value! ? "filled" : ""}
                                key={i}
                              />
                            ))}
                          </div>
                          <strong>{value}</strong>
                        </div>
                      ))}
                  </div>
                  {campaign.roster.includes(currentPlayer.id) ? (
                    <div className="profile-contract">
                      <Shield size={18} />
                      <div>
                        <strong>
                          Starting {currentPlayer.role.toLowerCase()}
                        </strong>
                        <p>
                          Weekly contract · {money(currentPlayer.wage)}. Manage
                          practice from Training.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="sign-player">
                      <div>
                        <strong>{money(currentPlayer.fee)} signing fee</strong>
                        <p>
                          Replaces{" "}
                          {
                            roster.find((p) => p.role === currentPlayer.role)
                              ?.name
                          }{" "}
                          in the starting lineup.
                        </p>
                      </div>
                      <button
                        className="button primary"
                        disabled={campaign.cash < currentPlayer.fee}
                        onClick={() => {
                          update((c) => signPlayer(c, currentPlayer.id));
                          notify(
                            `${currentPlayer.name} signed as your new ${currentPlayer.role.toLowerCase()}.`,
                          );
                          setPlayer(null);
                          setViewResult(null);
                        }}
                      >
                        {campaign.cash < currentPlayer.fee
                          ? "Insufficient funds"
                          : "Sign player"}
                        <Plus size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {viewResult && (
              <SeriesResults
                result={viewResult}
                onClose={() => setViewResult(null)}
              />
            )}
            {event &&
              campaign &&
              (simDone && activeEventResult ? (
                <SeriesResults
                  result={activeEventResult}
                  onClose={() => {
                    setEvent(null);
                    go("history");
                  }}
                />
              ) : pendingSimulation ? (
                <MatchViewer
                  simulation={pendingSimulation}
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
                    <div className="org-mark">
                      <Shield size={24} />
                    </div>
                    <strong>{campaign.settings.team}</strong>
                    <span>VS</span>
                    <strong>
                      {opponentFor(prepareEvent(campaign, event))}
                    </strong>
                    <div className="org-mark opponent">
                      <Swords size={24} />
                    </div>
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
                      recruit free agents to replace starters.
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
                  This is a scaffold with fictional data. Detailed drafting,
                  tactical orders, historical rosters, patch effects, bootcamps,
                  automated shuffles, and long-term procedural generation are
                  future systems.
                </div>
              </div>
            )}
            {preferences && (
              <div className="text-modal">
                <div className="eyebrow">YOUR WORKSPACE</div>
                <h2 id="modal-title">Campaign settings</h2>
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
                <div className="settings-row">
                  <span>Game data</span>
                  <Badge tone="gold">FICTIONAL / PLACEHOLDER</Badge>
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
                  Starting {settings.team} in {settings.year} will replace the
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
  );
}
