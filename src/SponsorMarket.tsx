import { useState } from "react";
import { scaledCost } from "./economy-scale";
import { SPONSOR_NEGOTIATOR_ID, staffCatalog } from "./staff";
import type { Campaign } from "./game";
import { money } from "./game";
import { sponsorTerms, activeSponsorDeals, benefitLabels, initialSponsorOffer, legacySponsors, managedSponsorTeam, negotiateSponsor, recommendedSponsorOffer, sponsorBenefits, sponsorBlocker, sponsorDate, sponsorNegotiator, sponsorRecommendations, sponsors, sponsorSlotsUsed, sponsorWeeksLeft, teamSponsorDeals } from "./sponsors";
import type { Sponsor, SponsorOffer } from "./sponsors";
import "./sponsors.css";

function Negotiation({ campaign, sponsor, initialOffer, onChange, onClose }: {
  campaign: Campaign; sponsor: Sponsor; initialOffer?: SponsorOffer; onChange: (c: Campaign) => void; onClose: () => void;
}) {
  const [offer, setOffer] = useState<SponsorOffer>(() => initialOffer ?? initialSponsorOffer(campaign, sponsor));
  const [response, setResponse] = useState<ReturnType<typeof negotiateSponsor> | null>(null);
  const change = (key: keyof SponsorOffer, value: number) => { setOffer((o) => ({ ...o, [key]: value })); setResponse(null); };
  const blocker = sponsorBlocker(campaign, sponsor);
  const negotiator = sponsorNegotiator(campaign);
  const suggestion = recommendedSponsorOffer(campaign, sponsor, offer.weeks, offer.mediaHours, offer.bonus);
  return <section className="panel sponsor-negotiation" aria-label={`Negotiate with ${sponsor.name}`}>
    <div className="sponsor-heading"><div><span className="eyebrow">Propose a partnership</span><h3>{sponsor.name}</h3></div><button type="button" className="button secondary small-button" onClick={onClose}>Close negotiation</button></div>
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
      {negotiator && suggestion && <div className="sponsor-response"><strong>{negotiator.name} recommends</strong><p>{money(suggestion.weekly)} / week and {money(suggestion.bonus)} on signing with your selected length and media time. The 15% negotiated budget increase is included. This uses the available package budget while retaining your requested bonus where possible.</p><button type="button" className="button secondary" onClick={() => { setOffer(suggestion); setResponse(null); }}>Use negotiator’s terms</button></div>}
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

function NegotiatorAdvice({ campaign, onStaff, onRecommend }: {
  campaign: Campaign; onStaff: () => void; onRecommend: (s: Sponsor, offer: SponsorOffer) => void;
}) {
  const [weeks, setWeeks] = useState(18);
  const [mediaHours, setMediaHours] = useState(1);
  const negotiator = sponsorNegotiator(campaign);
  const recommendations = sponsorRecommendations(campaign, weeks, mediaHours);
  const portfolio = recommendations.slice(0, Math.max(0, 5 - sponsorSlotsUsed(campaign)));
  const extra = portfolio.reduce((sum, r) => sum + r.extraTotal, 0) / weeks;
  return <section className="panel sponsor-advice" aria-label="Sponsor negotiator advice">
    <span className="eyebrow">Commercial staff</span><h3>{negotiator ? `${negotiator.name} · sponsor recommendations` : "Get more from your sponsors"}</h3>
    {!negotiator ? <><p>Hire a sponsor negotiator for {money(scaledCost(campaign.year, staffCatalog.find(s => s.id === SPONSOR_NEGOTIATOR_ID)!.weekly))} / week in Staff. They raise the budget for new agreements by 15%, suggest terms and rank eligible brands by financial support. Existing agreements keep their signed terms.</p><button className="button secondary" onClick={onStaff}>Find a sponsor negotiator</button></> : <>
      <p>Ranked by total guaranteed support on matching terms, including the signing bonus. Recommendations respect your reputation, era, sponsor ownership and available slots. Benefits are listed separately; media time and longer commitments remain tradeoffs.</p>
      <div className="sponsor-fields sponsor-advice-controls"><label>Compare contract length<select value={weeks} onChange={e => setWeeks(Number(e.target.value))}>{[6, 18, 36].map(n => <option key={n} value={n}>{n} weeks</option>)}</select></label><label>Compare media per player / week<select value={mediaHours} onChange={e => setMediaHours(Number(e.target.value))}>{[0, 1, 2].map(n => <option key={n} value={n}>{n} {n === 1 ? "hour" : "hours"} per deal</option>)}</select></label></div>
      {!!portfolio.length && <p className="sponsor-advice-economics">Signing the best {portfolio.length} available {portfolio.length === 1 ? "deal" : "deals"} for your remaining slots could add <strong>{money(extra)} / week</strong> in support above unassisted packages, with bonuses spread over {weeks} weeks. After {negotiator.name}’s {money(negotiator.weekly)} weekly wage, that is <strong>{money(extra - negotiator.weekly)} / week</strong> from these new deals. The wage is paid once across your portfolio. Media commitments add across deals; extra support continues on signed terms after releasing the negotiator.</p>}
      <div className="sponsor-advice-grid">{recommendations.slice(0, 3).map((r, i) => <article className="sponsor-recommendation" key={r.sponsor.id}>
        <span className="eyebrow">#{i + 1} for financial support</span><h4>{r.sponsor.name}</h4><strong>{money(r.total)} over {weeks} weeks</strong>
        <p>{money(r.offer.weekly)} / week + {money(r.offer.bonus)} signing bonus · {money(r.weeklyValue)} / week including bonus.</p>
        <p>Negotiator adds {money(r.extraTotal)} across the term before staff wages. {benefitLabels[r.sponsor.benefit]}.</p>
        <p>{mediaHours === 0 ? "No media obligations or media-related energy / development costs." : `${mediaHours} media ${mediaHours === 1 ? "hour" : "hours"} per starter / week: −${mediaHours} energy and −${mediaHours * 5}% development before combined caps.`}</p>
        <button className="button secondary full" onClick={() => onRecommend(r.sponsor, r.offer)}>Review {r.sponsor.name} terms</button>
      </article>)}</div>
      {!recommendations.length && <p>{sponsorSlotsUsed(campaign) >= 5 ? "All five sponsor slots are occupied. Recommendations return when an agreement expires." : "No sponsors are eligible right now. Improve your reputation or check again as rival agreements expire and new brands enter the catalog."}</p>}
    </>}
  </section>;
}

export default function SponsorMarket({ campaign, onChange, onStaff }: { campaign: Campaign; onChange: (c: Campaign) => void; onStaff: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("era");
  const [selected, setSelected] = useState<{ id: string; offer?: SponsorOffer } | null>(null);
  const openNegotiation = (s: Sponsor, offer?: SponsorOffer) => {
    setSelected({ id: s.id, offer });
    window.setTimeout(() => document.querySelector(".sponsor-negotiation")?.scrollIntoView({ block: "center", behavior: "smooth" }), 0);
  };
  const active = activeSponsorDeals(campaign);
  const mine = teamSponsorDeals(campaign);
  const managed = managedSponsorTeam(campaign);
  const benefits = sponsorBenefits(campaign);
  const selection = sponsors.find((s) => s.id === selected?.id);
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
      {mine.map((d) => <div className="sponsor-portfolio-row" key={d.sponsorId}><strong>{sponsors.find((s) => s.id === d.sponsorId)?.name}</strong><span>{money(d.weekly)} / week · {d.mediaHours} media h</span><span>{sponsorWeeksLeft(campaign, d)} weeks left · ends {sponsorDate(d.expiresAt, campaign)}</span></div>)}
      {legacySponsors(campaign).map((s) => <div className="sponsor-portfolio-row" key={s.id}><strong>{s.name}</strong><span>{money(s.weekly)} / week</span><span>Legacy rolling partnership · occupies one slot</span></div>)}
      <p>Current weekly effects: {benefits.growth.toFixed(2)} general attribute development · {benefits.energy >= 0 ? "+" : ""}{benefits.energy} energy · +{benefits.happiness} happiness · +{benefits.reputation.toFixed(2)} reputation · {benefits.mediaHours} media hours per starter. Analytics bonuses depend on training focus. Training previews include these effects.</p>
    </div>
    <NegotiatorAdvice campaign={campaign} onStaff={onStaff} onRecommend={openNegotiation} />
    {selection && <Negotiation key={`${selection.id}:${JSON.stringify(selected?.offer)}`} campaign={campaign} sponsor={selection} initialOffer={selected?.offer} onChange={onChange} onClose={() => setSelected(null)} />}
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
          <span className="eyebrow">{s.category}</span><h3>{s.name}</h3>
          <span className="sponsor-era">Catalog era: {s.from} onward</span>
          <p>{benefitLabels[s.benefit]}</p>
          <div className="sponsor-quote"><strong>{money(sponsorTerms(campaign.year, s).weekly)} / week</strong><span>+ {money(sponsorTerms(campaign.year, s).bonus)} bonus · opening ask · results bonuses for top-eight finishes</span></div>
          <p>{holder ? <><strong>{holder.teamId === managed ? "Your team" : holder.teamName}</strong> · {sponsorWeeksLeft(campaign, holder)} weeks left · ends {sponsorDate(holder.expiresAt, campaign)}<br />Simulated exclusive agreement</> : s.from > campaign.year ? `Enters the catalog in ${s.from}` : "Available · negotiate terms"}</p>
          <p className="sponsor-gate">{blocker ?? (s.requirement ? `${s.requirement} reputation required · you have ${Number(campaign.reputation.toFixed(2))}` : "Open to emerging clubs")}</p>
          <button className="button secondary full" disabled={!!blocker} aria-expanded={selected?.id === s.id} onClick={() => openNegotiation(s)}>Negotiate with {s.name}</button>
          <details><summary>Historical evidence</summary><p>{s.association}</p><p>{s.evidence}. This is an era reference, not a continuous real-world contract.</p><a href={s.source} target="_blank" rel="noreferrer">{s.sourceTitle}</a></details>
        </article>;
      })}
    </div>
    {!visible.length && <p>No sponsors match these filters.</p>}
  </section>;
}
