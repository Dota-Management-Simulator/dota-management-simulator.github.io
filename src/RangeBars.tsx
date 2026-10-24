import type { Estimate } from "./patch-knowledge";
import "./ranges.css";

/** Intervals, never filled-to-midpoint ratings. Every row shares the same scale. */
export default function RangeBars({ label, current, previous, unit = "", lowLabel = "0", highLabel = "100" }: {
  label: string; current: Estimate; previous?: Estimate; unit?: string; lowLabel?: string; highLabel?: string;
}) {
  return <div className="range-bars">
    {([{ name: "Current", range: current }, ...(previous ? [{ name: "Previous", range: previous }] : [])]).map(({ name, range }) =>
      <div className={`range-bar-row ${name === "Previous" ? "range-bar-previous" : ""}`} key={name}>
        <span className="range-bar-label">{name}</span>
        <div className="range-bar-track" role="img" aria-label={`${label}, ${name.toLowerCase()} estimate: ${range.low} to ${range.high}${unit} out of 100`}>
          <span style={{ left: `${range.low}%`, width: `${range.high - range.low}%` }} />
        </div>
        <strong>{range.low}–{range.high}{unit}</strong>
      </div>)}
    <div className="range-bar-scale" aria-hidden="true"><span>{lowLabel}</span><span>{highLabel}</span></div>
  </div>;
}
