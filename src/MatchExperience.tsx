import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Flag,
  Pause,
  Play,
  SkipForward,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { BASES, LANES, matchClock } from "./battle";
import type {
  GameSummary,
  PlayerScore,
  ReplayFrame,
  ResourcePoint,
  SimulatedSeries,
} from "./battle";
import type { Result } from "./game";
import { heroById } from "./heroes";

const COLORS = ["#c8b16f", "#9da6e2"];
const compact = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
function HeroToken({ score }: { score: PlayerScore }) {
  const hero = heroById(score.heroId);
  return (
    <span
      className={`match-hero-token attr-${hero?.attribute.toLowerCase() || "agility"}`}
      aria-hidden="true"
    >
      {score.hero
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}

function ResourceGraph({
  timeline,
  resource,
  teams,
}: {
  timeline: ResourcePoint[];
  resource: "gold" | "xp";
  teams: [string, string];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 500,
    height = 180,
    left = 42,
    right = 12,
    top = 16,
    bottom = 26;
  const maxTime = timeline.at(-1)?.time || 1;
  const maxValue =
    Math.max(
      1000,
      ...timeline.map((p) => Math.abs(p[resource][0] - p[resource][1])),
    ) * 1.1;
  const x = (time: number) => left + (time / maxTime) * (width - left - right);
  const y = (value: number) =>
    top + ((maxValue - value) / (2 * maxValue)) * (height - top - bottom);
  const line = timeline
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(p[resource][0] - p[resource][1]).toFixed(1)}`,
    )
    .join(" ");
  const fill = `${line} L${x(maxTime)},${y(0)} L${x(0)},${y(0)} Z`;
  const selected = hover === null ? timeline.at(-1) : timeline[hover];
  const advantage = selected
    ? selected[resource][0] - selected[resource][1]
    : 0;
  const color = resource === "gold" ? "#cbb06d" : "#94abd5";
  const label = resource === "gold" ? "Gold advantage" : "XP advantage";
  return (
    <section className="resource-chart">
      <div className="chart-heading">
        <h3>{label}</h3>
        <strong style={{ color }}>
          {advantage === 0
            ? "Even"
            : `${advantage > 0 ? "+" : ""}${compact(advantage)}`}
        </strong>
      </div>
      <div className="chart-context">
        {selected ? matchClock(selected.time) : "0:00"} ·{" "}
        {advantage === 0
          ? "An even game"
          : `${teams[advantage > 0 ? 0 : 1]} ahead`}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} across the game; positive values favor ${teams[0]}`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const time =
            Math.max(
              0,
              Math.min(
                1,
                (((e.clientX - box.left) / box.width) * width - left) /
                  (width - left - right),
              ),
            ) * maxTime;
          let nearest = 0;
          for (let i = 1; i < timeline.length; i++)
            if (
              Math.abs(timeline[i].time - time) <
              Math.abs(timeline[nearest].time - time)
            )
              nearest = i;
          setHover(nearest);
        }}
      >
        {[-1, 0, 1].map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={width - right}
              y1={y(v * maxValue)}
              y2={y(v * maxValue)}
              className={v === 0 ? "chart-zero" : "chart-grid"}
            />
            <text
              x={left - 8}
              y={y(v * maxValue) + 3}
              textAnchor="end"
              className="chart-label"
            >
              {v === 0
                ? "0"
                : `${v > 0 ? "+" : ""}${compact(Math.round(v * maxValue))}`}
            </text>
          </g>
        ))}
        <path d={fill} fill={color} opacity=".1" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={f}
            x={x(f * maxTime)}
            y={height - 6}
            textAnchor="middle"
            className="chart-label"
          >
            {matchClock(f * maxTime)}
          </text>
        ))}
        {selected && (
          <g>
            <line
              x1={x(selected.time)}
              x2={x(selected.time)}
              y1={top}
              y2={height - bottom}
              stroke={color}
              strokeDasharray="3 4"
              opacity=".4"
            />
            <circle
              cx={x(selected.time)}
              cy={y(advantage)}
              r="4"
              fill={color}
            />
          </g>
        )}
      </svg>
      <label className="chart-scrubber">
        <span>Inspect timeline</span>
        <input
          aria-label={`Inspect ${resource} timeline`}
          type="range"
          min="0"
          max={Math.max(0, timeline.length - 1)}
          value={hover ?? timeline.length - 1}
          onChange={(e) => setHover(Number(e.target.value))}
        />
      </label>
      {selected && (
        <div className="chart-totals">
          <span>
            <i style={{ background: COLORS[0] }} />
            {teams[0]} <b>{compact(selected[resource][0])}</b>
          </span>
          <span>
            <i style={{ background: COLORS[1] }} />
            {teams[1]} <b>{compact(selected[resource][1])}</b>
          </span>
        </div>
      )}
    </section>
  );
}

function Scoreboard({
  game,
  teams,
}: {
  game: GameSummary;
  teams: [string, string];
}) {
  return (
    <div className="match-scoreboards">
      {([0, 1] as const).map((team) => (
        <section key={team} className="match-scoreboard">
          <div className="scoreboard-heading">
            <span className={`side-dot side-${team}`} />
            <h3>{teams[team]}</h3>
            {game.winner === team && (
              <span className="match-win-label">
                <Check size={12} /> VICTORY
              </span>
            )}
            <strong>
              {game.kills[team]} <small>kills</small>
            </strong>
          </div>
          <div className="scoreboard-scroll">
            <table>
              <thead>
                <tr>
                  <th>PLAYER / HERO</th>
                  <th>LVL</th>
                  <th>K / D / A</th>
                  <th>GOLD</th>
                  <th>XP</th>
                  <th>LH</th>
                </tr>
              </thead>
              <tbody>
                {game.players
                  .filter((p) => p.team === team)
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="scoreboard-player">
                          <HeroToken score={p} />
                          <span>
                            <strong>{p.player}</strong>
                            <small>{p.hero}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="level-box">{p.level}</span>
                      </td>
                      <td className="kda-cell">
                        <strong>{p.kills}</strong>
                        <span> / </span>
                        {p.deaths}
                        <span> / </span>
                        {p.assists}
                      </td>
                      <td>{compact(p.gold)}</td>
                      <td>{compact(p.xp)}</td>
                      <td>{p.lastHits}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export function SeriesResults({
  result,
  onClose,
}: {
  result: Result;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const series = result.series;
  if (!series)
    return (
      <div className="text-modal">
        <div className="eyebrow">ARCHIVED RESULT</div>
        <h2 id="modal-title">{result.event}</h2>
        <div className="result-score">{result.score}</div>
        <p>
          This result predates the lane engine. Detailed scoreboards and graphs
          are available for newly played events.
        </p>
        <button className="button secondary full" onClick={onClose}>
          Back to management <ArrowRight size={15} />
        </button>
      </div>
    );
  const game = series.games[Math.min(selected, series.games.length - 1)];
  return (
    <div className="series-results">
      <div className="match-heading">
        <div className="eyebrow">
          {result.event} · {result.year} · BEST OF THREE
        </div>
        <h2 id="modal-title">
          {result.won ? "A series to remember." : "A lesson for the next one."}
        </h2>
        <div className="series-scoreline">
          <strong>{series.teams[0]}</strong>
          <span>
            {series.score[0]} <i>—</i> {series.score[1]}
          </span>
          <strong>{series.teams[1]}</strong>
        </div>
        <div
          className={`series-outcome ${result.won ? "series-victory" : "series-defeat"}`}
        >
          <Trophy size={14} />
          {result.won ? "SERIES VICTORY" : "SERIES DEFEAT"}
          <span>
            +${result.prize.toLocaleString()} · +{result.points} circuit points
          </span>
        </div>
      </div>
      <div className="game-tabs" role="group" aria-label="Select game">
        {series.games.map((g, i) => (
          <button
            key={i}
            aria-pressed={selected === i}
            className={selected === i ? "selected" : ""}
            onClick={() => setSelected(i)}
          >
            Game {i + 1}
            <span className={g.winner === 0 ? "game-win" : "game-loss"}>
              {g.winner === 0 ? "W" : "L"}
            </span>
            <small>{matchClock(g.duration)}</small>
          </button>
        ))}
      </div>
      <div className="game-facts">
        <span>
          <Clock3 size={14} />
          {matchClock(game.duration)}
        </span>
        <span>
          <Swords size={14} />
          {game.kills[0]} – {game.kills[1]}
        </span>
        <span>
          <Flag size={14} />
          Towers {game.towers[0]} – {game.towers[1]}
        </span>
        <span>Ancient destroyed{game.overtime ? " · Overtime siege" : ""}</span>
      </div>
      <Scoreboard game={game} teams={series.teams} />
      <div className="match-graphs" key={selected}>
        <ResourceGraph
          timeline={game.timeline}
          resource="gold"
          teams={series.teams}
        />
        <ResourceGraph
          timeline={game.timeline}
          resource="xp"
          teams={series.teams}
        />
      </div>
      <p className="match-footnote">
        Graphs use recorded simulation totals. Positive advantage favors your
        team. Gold includes starting resources, passive income, farm, kills, and
        objectives; item power is abstract. Assists count recent damage
        contributors. Prototype abilities and balance are simplified.
      </p>
      <button className="button primary full" onClick={onClose}>
        Back to management <ArrowRight size={16} />
      </button>
    </div>
  );
}

function MapReplay({
  before,
  after,
  ratio,
}: {
  before: ReplayFrame;
  after: ReplayFrame;
  ratio: number;
}) {
  const nextUnits = new Map(after.units.map((u) => [u.id, u]));
  return (
    <svg
      className="battle-map"
      viewBox="0 0 800 800"
      role="img"
      aria-label="Match playback: heroes, creep waves, towers, and Ancients across three lanes"
    >
      <defs>
        <pattern
          id="map-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="#d4dfa1"
            strokeOpacity=".035"
          />
        </pattern>
        <linearGradient id="map-bg" x2="1" y2="1">
          <stop stopColor="#18291f" />
          <stop offset="1" stopColor="#192126" />
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#map-bg)" />
      <rect width="800" height="800" fill="url(#map-grid)" />
      <path
        d="M0 210Q240 180 400 400T800 590"
        stroke="#608da0"
        strokeWidth="36"
        opacity=".14"
        fill="none"
      />
      {LANES.map((lane, i) => (
        <polyline
          key={i}
          points={lane.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="#667959"
          strokeOpacity=".25"
          strokeWidth="49"
          strokeLinejoin="round"
        />
      ))}
      {Array.from({ length: 22 }, (_, i) => (
        <g
          key={i}
          transform={`translate(${190 + ((i * 109) % 410)},${120 + ((i * 167) % 570)})`}
          opacity=".14"
        >
          <path d="m0-13-9 17h18Zm0 0v24" fill="#92ae72" stroke="#92ae72" />
        </g>
      ))}
      <text
        x="160"
        y="746"
        fill={COLORS[0]}
        opacity=".6"
        fontSize="14"
        letterSpacing="4"
      >
        RADIANT
      </text>
      <text
        x="550"
        y="58"
        fill={COLORS[1]}
        opacity=".6"
        fontSize="14"
        letterSpacing="4"
      >
        DIRE
      </text>
      {before.units.map((unit) => {
        const next = nextUnits.get(unit.id);
        const x =
          unit.x +
          (next && !(unit.hp <= 0 !== next.hp <= 0) ? next.x - unit.x : 0) *
            ratio;
        const y =
          unit.y +
          (next && !(unit.hp <= 0 !== next.hp <= 0) ? next.y - unit.y : 0) *
            ratio;
        const dead = unit.hp <= 0;
        const color = COLORS[unit.team];
        return (
          <g
            key={unit.id}
            transform={`translate(${x},${y})`}
            opacity={dead ? 0.17 : 1}
          >
            <title>
              {unit.name} · {Math.max(0, unit.hp)} / {unit.max} HP
            </title>
            {unit.kind === "tower" ? (
              <>
                <rect
                  x="-11"
                  y="-11"
                  width="22"
                  height="22"
                  rx="3"
                  fill={dead ? "#455344" : color}
                />
                <path
                  d="M-5 5V-4H5V5"
                  stroke="#18231c"
                  strokeWidth="2"
                  fill="none"
                />
              </>
            ) : unit.kind === "base" ? (
              <>
                <circle r="29" fill={color} opacity=".14" />
                <path
                  d="m0-22 19 11-4 23L0 25l-15-13-4-23Z"
                  fill="#243127"
                  stroke={color}
                  strokeWidth="3"
                />
              </>
            ) : unit.kind === "hero" ? (
              <>
                <circle
                  r="15"
                  fill="#202d25"
                  stroke={color}
                  strokeWidth="2.5"
                />
                <text
                  y="5"
                  textAnchor="middle"
                  fill={color}
                  fontSize="12"
                  fontWeight="700"
                >
                  {unit.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </text>
              </>
            ) : (
              <circle r="4" fill={color} opacity=".7" />
            )}
            {unit.kind !== "creep" && !dead && (
              <>
                <rect x="-17" y="-23" width="34" height="3" fill="#101812" />
                <rect
                  x="-17"
                  y="-23"
                  width={34 * Math.max(0, unit.hp / unit.max)}
                  height="3"
                  fill={color}
                />
              </>
            )}
          </g>
        );
      })}
      {BASES.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r="47"
          fill="none"
          stroke={COLORS[i]}
          strokeDasharray="3 7"
          opacity=".2"
        />
      ))}
    </svg>
  );
}

export function MatchViewer({
  simulation,
  onFinish,
}: {
  simulation: SimulatedSeries;
  onFinish: () => void;
}) {
  const [gameIndex, setGameIndex] = useState(0);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const completed = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const game = simulation.summary.games[gameIndex];
  const frames = simulation.frames[gameIndex];
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      last = now;
      setClock((t) => Math.min(game.duration, t + elapsed * 60 * speed));
    }, 50);
    return () => clearInterval(timer);
  }, [playing, speed, game.duration, gameIndex]);
  useEffect(() => {
    if (clock < game.duration || completed.current) return;
    const timer = setTimeout(() => {
      if (gameIndex < simulation.summary.games.length - 1) {
        setGameIndex((i) => i + 1);
        setClock(0);
      } else {
        completed.current = true;
        finishRef.current();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [clock, game.duration, gameIndex, simulation.summary.games.length]);
  let before = frames[0],
    after = frames.at(-1)!;
  if (clock >= game.duration) before = after;
  else
    for (let i = 1; i < frames.length; i++)
      if (frames[i].time >= clock) {
        before = frames[i - 1];
        after = frames[i];
        break;
      }
  const ratio =
    after.time === before.time
      ? 0
      : Math.max(
          0,
          Math.min(1, (clock - before.time) / (after.time - before.time)),
        );
  const kills = clock >= game.duration ? game.kills : before.kills;
  return (
    <div className="match-viewer">
      <div className="watch-heading">
        <div>
          <div className="eyebrow">LANE SIEGE · EVENT DECIDER</div>
          <h2 id="modal-title">The team takes the stage.</h2>
        </div>
        <button
          className="button secondary small-button"
          onClick={() => {
            completed.current = true;
            onFinish();
          }}
        >
          <SkipForward size={15} /> Skip to results
        </button>
      </div>
      <div className="live-score">
        <strong style={{ color: COLORS[0] }}>
          {simulation.summary.teams[0]}
        </strong>
        <span>
          <b>{kills[0]}</b>
          <small>{matchClock(clock)}</small>
          <b>{kills[1]}</b>
        </span>
        <strong style={{ color: COLORS[1] }}>
          {simulation.summary.teams[1]}
        </strong>
      </div>
      <div className="watch-layout">
        <div className="map-wrap">
          <MapReplay before={before} after={after} ratio={ratio} />
          <span className="map-live-label">
            <i /> GAME {gameIndex + 1} · SIMULATION PLAYBACK
          </span>
          {clock >= game.duration && (
            <div className="map-victory">
              <Trophy size={26} />
              {simulation.summary.teams[game.winner]} wins Game {gameIndex + 1}
            </div>
          )}
        </div>
        <div className="live-rosters">
          {([0, 1] as const).map((team) => (
            <section key={team}>
              <h3 style={{ color: COLORS[team] }}>
                {simulation.summary.teams[team]}
              </h3>
              {before.players
                .filter((p) => p.team === team)
                .map((p) => (
                  <div className="live-player" key={p.id}>
                    <HeroToken score={p} />
                    <span>
                      <strong>{p.player}</strong>
                      <small>{p.hero}</small>
                    </span>
                    <b>
                      {p.kills}/{p.deaths}/{p.assists}
                      <small>LV {p.level}</small>
                    </b>
                  </div>
                ))}
            </section>
          ))}
        </div>
      </div>
      <div className="watch-controls">
        <button
          className="icon-button"
          aria-label={playing ? "Pause playback" : "Resume playback"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div role="group" aria-label="Playback speed">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              aria-pressed={speed === s}
              className={speed === s ? "selected" : ""}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
        <span>
          Game {gameIndex + 1} of {simulation.summary.games.length} · Best of
          three
        </span>
        <button className="text-link" onClick={() => setClock(game.duration)}>
          Next result <ArrowRight size={14} />
        </button>
      </div>
      <p className="match-footnote">
        Accelerated playback of the lane engine. Speed, pause, and skip do not
        alter the outcome. Gold, XP, and K/D/A are recorded throughout each
        game.
      </p>
    </div>
  );
}

export function ComputingMatch({
  progress,
  error,
  onSkip,
  onCancel,
}: {
  progress: number;
  error: string;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="computing-match">
      <div className="event-emblem large">
        <Swords size={30} />
      </div>
      <div className="eyebrow">THE PLAYERS ARE GETTING READY</div>
      <h2 id="modal-title">
        {error ? "The match could not start." : "Simulating the series…"}
      </h2>
      <p>
        {error ||
          "Drafting from the TI1 hero pool and resolving lane combat in the background."}
      </p>
      {!error && (
        <>
          <div className="meter">
            <span style={{ width: `${Math.max(8, progress)}%` }} />
          </div>
          <button className="button secondary" onClick={onSkip}>
            <SkipForward size={15} /> Skip playback when ready
          </button>
        </>
      )}
      {error && (
        <button className="button secondary" onClick={onCancel}>
          <X size={15} /> Back to management
        </button>
      )}
    </div>
  );
}
