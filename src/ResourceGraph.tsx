import { useState } from "react";
import { matchClock } from "./battle";
import type { ResourcePoint } from "./battle";
const COLORS = ["#9acb6a", "#df8c80"];
const compact = (n: number) => Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function ResourceGraph({
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
  const wealth = resource === "gold" && timeline.some(p=>p.netWorth);
  const values = (p:ResourcePoint) => wealth ? p.netWorth ?? p.gold : p[resource];
  const maxValue =
    Math.max(
      1000,
      ...timeline.map((p) => Math.abs(values(p)[0] - values(p)[1])),
    ) * 1.1;
  const x = (time: number) => left + (time / maxTime) * (width - left - right);
  const y = (value: number) =>
    top + ((maxValue - value) / (2 * maxValue)) * (height - top - bottom);
  const line = timeline
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${x(p.time).toFixed(1)},${y(values(p)[0] - values(p)[1]).toFixed(1)}`,
    )
    .join(" ");
  const fill = `${line} L${x(maxTime)},${y(0)} L${x(0)},${y(0)} Z`;
  const selected = hover === null ? timeline.at(-1) : timeline[hover];
  const advantage = selected
    ? values(selected)[0] - values(selected)[1]
    : 0;
  const color = resource === "gold" ? "#cbb06d" : "#94abd5";
  const label = resource === "gold" ? wealth ? "Net worth advantage" : "Gold advantage" : "XP advantage";
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
            {teams[0]} <b>{compact(values(selected)[0])}</b>
          </span>
          <span>
            <i style={{ background: COLORS[1] }} />
            {teams[1]} <b>{compact(values(selected)[1])}</b>
          </span>
        </div>
      )}
    </section>
  );
}
