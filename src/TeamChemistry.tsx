import type { Campaign } from "./game";
import { teamChemistry } from "./player-market";
import "./team-chemistry.css";

/** Planning view: how well the current five fit together. Gameplay estimates
 * from simulated attributes and actual campaign maps. */
export default function TeamChemistry({ campaign }: { campaign: Campaign }) {
  const chemistry = teamChemistry(campaign);
  if (!campaign.roster.length) return null;
  const shift = chemistry.teamRating - chemistry.overall;
  return <section className="panel team-chemistry" aria-label="Team rating and synergy">
    <div className="chemistry-summary">
      <div><span>Team rating</span><strong>{chemistry.teamRating}</strong><small>{chemistry.overall} average OVR {shift > 0 ? `+${shift}` : shift < 0 ? shift : "±0"} from synergy</small></div>
      <div><span>Synergy</span><strong>{chemistry.synergy}</strong><small>{chemistry.synergy >= 70 ? "Clicking" : chemistry.synergy >= 50 ? "Working" : chemistry.synergy >= 35 ? "Uneven" : "Disjointed"}</small></div>
    </div>
    <ul className="chemistry-parts">{chemistry.parts.map(part => <li key={part.key}>
      <div className="chemistry-part-head"><strong>{part.label}</strong><span>{part.score}/{part.max}</span></div>
      <span className="chemistry-bar" role="meter" aria-label={part.label} aria-valuenow={part.score} aria-valuemin={0} aria-valuemax={part.max}><span style={{ width: `${part.max ? part.score / part.max * 100 : 0}%` }} /></span>
      <p>{part.detail}</p>
    </li>)}</ul>
  </section>;
}
