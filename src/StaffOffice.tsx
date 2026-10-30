import { patchLabel } from "./patch-label";
import { scaledCost } from "./economy-scale";
import { ArrowRight, Check, Plus, UserRound, Users } from "lucide-react";
import type { Campaign } from "./game";
import { money } from "./game";
import { staffCatalog } from "./staff";
import { campaignPatch, patchAxes } from "./patches";
import { managedPatchObserver, patchReport } from "./patch-knowledge";
import "./patches.css";
import { draftStaffBenefits } from "./team-scouting";
import { strategies } from "./tactics";

export default function StaffOffice({ campaign, onHire, onDismiss, onPatch, onSponsors }: {
  campaign: Campaign; onHire: (id: string) => void; onDismiss: (id: string) => void; onPatch: () => void; onSponsors: () => void;
}) {
  const report = patchReport(campaignPatch(campaign), managedPatchObserver(campaign));
  const hiredStaff = staffCatalog.filter(s => campaign.staffIds.includes(s.id));
  return <>
    <div className="info-strip"><span><Users size={17} /><strong>{hiredStaff.length} / {staffCatalog.length}</strong> support roles filled</span>
      <span>{money(hiredStaff.reduce((n, s) => n + scaledCost(campaign.year, s.weekly), 0))} / week · paid with payroll</span></div>
    <section className="panel staff-research">
      <div className="section-title"><div><h2>Your patch research · {patchLabel(report.patchId)}</h2>
        <p>Start with 35-point ranges and 2 favored heroes. The true value can fall anywhere in a range, including either end. Specialists narrow only their fields to 4–5 points or uncover more heroes.</p></div>
        <button className="text-link" onClick={onPatch}>View patch report <ArrowRight size={15} /></button></div>
      <div className="staff-coverage">{patchAxes.map(axis => <div key={axis.key}>
        <span>{axis.name}</span><strong>{report.axes[axis.key].low}–{report.axes[axis.key].high}</strong>
        <small>{report.axes[axis.key].width}-point spread</small></div>)}
        <div><span>Favored heroes found</span><strong>{report.heroes.length} / {report.totalHeroes}</strong><small>Used by your auto-draft</small></div></div>
      <p className="match-footnote">The patch has fixed underlying strengths. Employed staff provide their research coverage and hero shortlist. Overlapping specialties use the best coverage; they never stack to reveal an exact value. Releasing staff ends their coverage.</p>
    </section>
    <div className="staff-grid research-staff-grid">{staffCatalog.map(s => {
      const hired = campaign.staffIds.includes(s.id);
      const weekly = scaledCost(campaign.year, s.weekly), affordable = campaign.cash >= weekly * 4;
      return <article className="panel staff-card" key={s.id}>
        <div className={`staff-portrait ${s.color}`}><UserRound size={42} strokeWidth={1} /><span className="badge">{s.role}</span></div>
        <div className="staff-content"><h3>{s.name}</h3><p>{s.specialty}</p>
          {draftStaffBenefits[s.id] && <p>{draftStaffBenefits[s.id]}</p>}
          {s.role === "Sponsor negotiator" && <><p>Ranks eligible sponsors by total support on matching terms, suggests offers and compares the extra support with their wage. Signed deals retain their terms after release.</p><button className="text-link" onClick={onSponsors}>View sponsor recommendations <ArrowRight size={15} /></button></>}
          {strategies.some(play=>play.staff===s.id)&&<p>Playbook unlock: {strategies.filter(play=>play.staff===s.id).map(play=>play.name).join(" · ")}. Equip these before a map.</p>}
          <ul className="staff-specialties">{patchAxes.filter(axis => s.coverage[axis.key] != null).map(axis => {
            const current = report.axes[axis.key].width;
            const target = s.coverage[axis.key]!;
            return <li key={axis.key}><strong>{axis.name}</strong><span>{hired ? `${current}-point spread with your staff` : current > target ? `${current} → ${target}-point spread` : `Already covered at ${current} points`}</span></li>;
          })}<li>{s.benefit}{s.extraHeroes > 0 && <span>{hired ? "Included in your hero shortlist" : `${report.heroes.length} → ${Math.min(report.totalHeroes, report.heroes.length + s.extraHeroes)} known heroes`}</span>}</li></ul>
          <div className="staff-price"><strong>{money(weekly)}</strong><span> / week</span></div>
          <button disabled={hired || !affordable} className={`button ${hired ? "secondary" : "primary"} full`} onClick={() => onHire(s.id)}>
            {hired ? <><Check size={15} /> On your staff</> : !affordable ? "Need four weeks of wages" : <><Plus size={15} /> Hire {s.role.toLowerCase()}</>}
          </button>
          {hired ? <button className="text-link staff-dismiss" onClick={() => onDismiss(s.id)}>Release {s.name}</button>
            : <p className="staff-reserve">Requires {money(weekly * 4)} cash reserve. No signing fee.</p>}
        </div>
      </article>;
    })}</div>
  </>;
}
