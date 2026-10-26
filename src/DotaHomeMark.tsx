import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import "./dota-home-mark.css";

// Fixed offsets keep the small ember field stable across management renders.
const embers = [
  [30, 61, -9, 2.7, -1.8], [43, 65, 5, 3.2, -.4],
  [63, 56, 12, 2.5, -1.1], [71, 36, -6, 3.6, -2.8],
  [28, 29, -12, 3.1, -2.1], [54, 18, 8, 2.8, -.9],
  [39, 42, -5, 3.8, -3.2], [66, 67, 14, 3.4, -2.5],
];

/** Original Valve home-tab plate, with a small browser-rendered ember effect. */
export default function DotaHomeMark({ motion = true }: { motion?: boolean }) {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return <span className="dota-home-mark" data-motion={motion && visible ? "on" : "off"} aria-hidden="true">
    <span className="dota-home-mark__plate" />
    <span className="dota-home-mark__halo" />
    <span className="dota-home-mark__heat"><span /></span>
    <span className="dota-home-mark__embers">{embers.map(([x, y, drift, duration, delay], i) => <i key={i}
      style={{ left: `${x}%`, top: `${y}%`, "--ember-drift": `${drift}px`,
        animationDuration: `${duration}s`, animationDelay: `${delay}s` } as CSSProperties} />)}</span>
  </span>;
}
