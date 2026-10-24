import { useState } from "react";
import type { Campaign } from "./game";
import { money } from "./game";
import { activeSponsorDeals, benefitLabels, initialSponsorOffer, legacySponsors, managedSponsorTeam, negotiateSponsor, sponsorBenefits, sponsorBlocker, sponsorDate, sponsors, sponsorSlotsUsed, sponsorWeeksLeft, teamSponsorDeals } from "./sponsors";
import type { Sponsor, SponsorOffer } from "./sponsors";
import SponsorBadge from "./SponsorBadge";
import "./sponsors.css";

function Negotiation({ campaign, sponsor, onChange, onClose }: {
  campaign: Campaign; sponsor: Sponsor; onChange: (c: Campaign) => void; onClose: () => void;
}) {
  const [offer, setOffer] = useState<SponsorOffer>(() => initialSponsorOffer(sponsor));
  const [response, setResponse] = useState<ReturnType<typeof negotiateSponsor> | null>(null);
  const change = (key: keyof SponsorOffer, value: number) => { setOffer((o) => ({ ...o, [key]: value })); setResponse(null); };
  const blocker = sponsorBlocker(campaign, sponsor);
  return <section className="panel sponsor-negotiation" aria-label={`Negotiate with ${sponsor.name}`}>
    <div className="sponsor-heading"><div><span className="eyebrow">Propose a partnership</span><h3 className="sponsor-name"><SponsorBadge id={sponsor.id} name={sponsor.name} />{sponsor.name}</h3></div><button type="button" className="button secondary small-button" onClick={onClose}>Close negotiation</button></div>
    <p>Ask the sponsor for support in return for a fixed commitment. More media time or a longer deal can improve their budget. The agreement signs when your submitted terms are accepted.</p>
    <form onSubmit={(e) => {
      e.preventDefault();
      const result = negotiateSponsor(campaign, sponsor.id, offer);
      setResponse(result);
      if (result.status === "accepted") onChange(result.campaign);
    }}>
      <div className="sponsor-fields">
        <label>Weekly support ($)<input autoFocus type="number" min="100" max="100000" step="1" required value={offer.weekly} onChange={(e) => change("weekly", Number(e.target.value))} /></label>
        <label>Signing bonus ($)<input type="number" min="0" max="1000000" step="1" required value={offer.bonus} onChange={(e) => change("bonus", Number(e.target.value))} /></label>
        <label>Contract length<select value={offer.weeks} onChange={(e) => change("weeks", Number(e.target.value))}>{[6, 18, 36].map((n) => <option key={n} value={n}>{n} weeks{!campaign.calendar && n === 18 ? " · one season" : !campaign.calendar && n === 36 ? " · two seasons" : ""}</option>)}</select></label>
        <label>Media per player / week<select value={offer.mediaHours} onChange={(e) => change("mediaHours", Number(e.target.value))}>{[0, 1, 2].map((n) => <option key={n} value={n}>{n} {n === 1 ? "hour" : "hours"}</option>)}</select></label>
      </div>
      <p><strong>{money(offer.weekly * offer.weeks + offer.bonus)} total support</strong> over {offer.weeks} weeks · {money(offer.bonus)} on signing.</p>
      <p>{benefitLabels[sponsor.benefit]}. Each media hour costs every starter 1 weekly energy and reduces attribute and playstyle development by 5%. Media still occurs during Rest. Commitments add across deals, with a 50% development reduction cap.</p>
      <p>Attribute benefits scale with practice volume and stop during Rest. Combined benefits cap at +0.30 attribute development, +6 energy, +3 happiness and +0.50 reputation per week. Full terms end at expiry; early renewal and poaching are unavailable.</p>
      {blocker && response?.status !== "accepted" && <p role="status">{blocker}</p>}
      <button type="submit" className="button primary" disabled={!!blocker}>Make offer & sign if accepted</button>
    </form>
    {response && <div className="sponsor-response" role="status">
      <strong>{response.status === "accepted" ? "Partnership signed" : response.status === "counter" ? `${sponsor.name} counters` : "Offer not signed"}</strong>
      <p>{response.message}</p>
      {response.counter && <><p>{money(response.counter.weekly)} / week · {money(response.counter.bonus)} bonus · {response.counter.weeks} weeks · {response.counter.mediaHours} media hours.</p><button type="button" className="button secondary" onClick={() => { setOffer(response.counter!); setResponse(null); }}>Use counteroffer</button></>}
    </div>}
  </section>;
}

export default function SponsorMarket({ campaign, onChange }: { campaign: Campaign; onChange: (c: Campaign) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("era");
  const [selected, setSelected] = useState<string | null>(null);
  const active = activeSponsorDeals(campaign);
  const mine = teamSponsorDeals(campaign);
  const managed = managedSponsorTeam(campaign);
  const benefits = sponsorBenefits(campaign);
  const selection = sponsors.find((s) => s.id === selected);
  const visible = sponsors.filter((s) => {
    if (!`${s.name} ${s.category} ${s.association}`.toLowerCase().includes(query.toLowerCase())) return false;
    const holder = active.find((d) => d.sponsorId === s.id);
    return filter === "all" || (s.from <= campaign.year && (filter === "era" || (filter === "free" && !holder) || (filter === "mine" && holder?.teamId === managed) || (filter === "rivals" && holder && holder.teamId !== managed)));
  });
  return <section className="sponsorship-market" aria-label="Sponsorship market">
    <div className="sponsor-heading"><div><h2>Sponsorship market</h2><p>{sponsorSlotsUsed(campaign)} / 5 active partnerships · one team per sponsor</p></div></div>
    <p>Brands unlock by documented era. Every holder, payment, contract length and benefit below is simulated for your alternate timeline. Real brands often sponsor several teams; global exclusivity and the five-partner limit are game rules.</p>
    <div className="panel sponsor-portfolio">
      <h3>Your partners</h3>
      {!mine.length && !legacySponsors(campaign).length && <p>No active agreements. Explore available sponsors and negotiate a package.</p>}
      {mine.map((d) => <div className="sponsor-portfolio-row" key={d.sponsorId}><strong className="sponsor-name"><SponsorBadge id={d.sponsorId} name={sponsors.find((s) => s.id === d.sponsorId)?.name ?? d.sponsorId} />{sponsors.find((s) => s.id === d.sponsorId)?.name}</strong><span>{money(d.weekly)} / week · {d.mediaHours} media h</span><span>{sponsorWeeksLeft(campaign, d)} weeks left · ends {sponsorDate(d.expiresAt, campaign)}</span></div>)}
      {legacySponsors(campaign).map((s) => <div className="sponsor-portfolio-row" key={s.id}><strong className="sponsor-name"><SponsorBadge id={s.id} name={s.name} />{s.name}</strong><span>{money(s.weekly)} / week</span><span>Legacy rolling partnership · occupies one slot</span></div>)}
      <p>Current weekly effects: {benefits.growth.toFixed(2)} general attribute development · {benefits.energy >= 0 ? "+" : ""}{benefits.energy} energy · +{benefits.happiness} happiness · +{benefits.reputation.toFixed(2)} reputation · {benefits.mediaHours} media hours per starter. Analytics bonuses depend on training focus. Training previews include these effects.</p>
    </div>
    {selection && <Negotiation key={selection.id} campaign={campaign} sponsor={selection} onChange={onChange} onClose={() => setSelected(null)} />}
    <div className="sponsor-filters">
      <label>Search brands<input type="search" placeholder="Brand, category, historical association…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>Show<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="era">This era</option><option value="free">Available this era</option><option value="mine">Your partners</option><option value="rivals">With other teams</option><option value="all">All eras</option></select></label>
      <span>{visible.length} {visible.length === 1 ? "sponsor" : "sponsors"} · season {campaign.year}</span>
    </div>
    <div className="sponsor-market-grid">
      {visible.map((s) => {
        const holder = active.find((d) => d.sponsorId === s.id);
        const blocker = sponsorBlocker(campaign, s);
        return <article className="panel sponsor-market-card" key={s.id}>
          <span className="eyebrow">{s.category}</span><h3 className="sponsor-name"><SponsorBadge id={s.id} name={s.name} />{s.name}</h3>
          <span className="sponsor-era">Catalog era: {s.from} onward</span>
          <p>{benefitLabels[s.benefit]}</p>
          <div className="sponsor-quote"><strong>{money(s.weekly)} / week</strong><span>+ {money(s.bonus)} bonus · opening ask</span></div>
          <p>{holder ? <><strong>{holder.teamId === managed ? "Your team" : holder.teamName}</strong> · {sponsorWeeksLeft(campaign, holder)} weeks left · ends {sponsorDate(holder.expiresAt, campaign)}<br />Simulated exclusive agreement</> : s.from > campaign.year ? `Enters the catalog in ${s.from}` : "Available · negotiate terms"}</p>
          <p className="sponsor-gate">{blocker ?? (s.requirement ? `${s.requirement} reputation required · you have ${Number(campaign.reputation.toFixed(2))}` : "Open to emerging clubs")}</p>
          <button className="button secondary full" disabled={!!blocker} aria-expanded={selected === s.id} onClick={() => { setSelected(s.id); window.setTimeout(() => document.querySelector(".sponsor-negotiation")?.scrollIntoView({ block: "center", behavior: "smooth" }), 0); }}>Negotiate with {s.name}</button>
          <details><summary>Historical evidence</summary><p>{s.association}</p><p>{s.evidence}. This is an era reference, not a continuous real-world contract.</p><a href={s.source} target="_blank" rel="noreferrer">{s.sourceTitle}</a></details>
        </article>;
      })}
    </div>
    {!visible.length && <p>No sponsors match these filters.</p>}
  </section>;
}
