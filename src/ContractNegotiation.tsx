import { useEffect, useRef, useState } from "react";
import { money, negotiateContract, recruitmentBlocker, teamPlayers } from "./game";
import type { Campaign, Player } from "./game";
import { contractPreferences, initialOffer, releaseCost, weeksRemaining } from "./contracts";
import type { ContractOffer } from "./contracts";
import "./contracts.css";
import { playerTournamentLock } from "./tournament-locks";
import { askingWage, candidateFit, marketValue, playerPersona, prizeShareDemand, signingFee } from "./player-market";
import { expectedWeeklyPrize, guaranteeFloor, MAX_PRIZE_SHARE, payProfile, PRESSURE_POINTS, shareValue } from "./pay-structure";
import { competingOffers } from './ai-club-economy';
import { recruitmentComparison } from './recruitment';

export default function ContractNegotiation({ campaign, player, onChange }: {
  campaign: Campaign; player: Player; onChange: (c: Campaign) => void;
}) {
  const managed = campaign.roster.includes(player.id);
  const contract = campaign.contracts?.[player.id];
  const remaining = contract ? weeksRemaining(campaign, contract) : 0;
  const tournamentLock = playerTournamentLock(campaign, player.id);
  const [editing, setEditing] = useState(!managed);
  const [offer, setOffer] = useState<ContractOffer>(() => initialOffer(campaign, player));
  const [response, setResponse] = useState<ReturnType<typeof negotiateContract> | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (response) responseRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [response]);
  const preference = contractPreferences(player,campaign);
  const outgoing = managed ? undefined : teamPlayers(campaign).find((p) => p.role === player.role);
  const severance = outgoing ? releaseCost(campaign, outgoing.id) : 0;
  const fee = managed ? 0 : signingFee(campaign, player);
  const fees = fee + severance;
  const value = marketValue(campaign, player), persona = playerPersona(campaign, player);
  const ask = askingWage(campaign, player), share = prizeShareDemand(campaign, player);
  const fit = managed ? null : candidateFit(campaign, player);
  const pay = payProfile(campaign, player), floor = Math.ceil(ask * guaranteeFloor(campaign, player) / 10) * 10;
  const offerGuarantee = Math.min(1, offer.wage / Math.max(1, value.wage));
  const offerPressure = Math.round(pay.pressure * (1 - offerGuarantee) * PRESSURE_POINTS * 10) / 10;
  const othersShare = campaign.roster.filter(id => id !== player.id && (managed || id !== outgoing?.id)).reduce((n, id) => n + (campaign.contracts?.[id]?.prizeShare ?? 0), 0);
  const alternatives = competingOffers(campaign, player), comparison = managed ? null : recruitmentComparison(campaign, player);
  const blocker = managed ? null : recruitmentBlocker(campaign, player.id);
  const change = (key: keyof ContractOffer, value: number) => {
    setOffer((o) => ({ ...o, [key]: value }));
    setResponse(null);
  };
  return <section className="contract-panel" aria-label="Player contract">
    <div className="contract-heading">
      <div>
        <h3>{managed ? "Player contract" : "Negotiate a signing"}</h3>
        <p>{managed ? contract ? remaining ? `${remaining} weeks left · ${money(player.wage)} / week` : tournamentLock ? "Contract extended through the current tournament" : "Renewal due · terms continue week to week" : `Rolling weekly agreement · ${money(player.wage)} / week` : outgoing ? `Replaces ${outgoing.name}.` : `Fills the vacant ${player.role.toLowerCase()} position.`}</p>
      </div>
      {!editing && <button className="button secondary small-button" onClick={() => {
        setOffer(initialOffer(campaign, player)); setResponse(null); setEditing(true);
      }}>Negotiate terms</button>}
    </div>
    {alternatives.length > 0 && <p className="contract-summary">Competing offers: {alternatives.map(o => `${o.club} · ${money(o.wage)}/week`).join(' · ')}. These raise the minimum package; another club can sign the player when the next market review runs.</p>}
    {comparison && <p className="contract-summary">At the displayed ask: {money(comparison.upfront)} up front, {money(comparison.additionalEightWeekCost)} additional cost over eight weeks, {money(comparison.closingCash)} projected closing cash. {comparison.firstDebt ? `Projected debt: ${comparison.firstDebt}.` : ''} Your proposed terms can change these amounts.</p>}
    {managed && contract && <p className="contract-summary">Up to {contract.practiceHours}h practice · at least {contract.restDays} rest days / week · {contract.prizeShare}% prize share · {money(releaseCost(campaign, player.id))} early release</p>}
    {tournamentLock && <p className="contract-summary">Tournament commitment: players finish their registered run before transfers or releases. Pay continues after expiry, with no renewal morale penalty during the run. Registered prize shares remain fixed for this tournament.</p>}
    <div className="contract-read" aria-label="Scouting read">
      <div><span>Market value</span><strong>{money(value.wage)} / wk</strong><small>Top {Math.max(1, Math.round((1 - value.percentile) * 100))}% of players</small></div>
      <div><span>Asks you for</span><strong>{money(ask)} / wk</strong><small>{persona.selfImage}</small></div>
      <div><span>Personality</span><strong>{persona.egoLabel}</strong><small>Ego {persona.ego}/10</small></div>
      <div><span>Prize share</span><strong>{share ? `Wants ${share}%` : "No demand"}</strong><small>{share ? "The club is winning" : "Until the club is winning"}</small></div>
      <div><span>Pay mix</span><strong>{pay.appetiteLabel}</strong><small>Needs {money(floor)} / wk guaranteed</small></div>
      <div><span>With money on the line</span><strong>{pay.pressureLabel}</strong><small>{pay.pressureLabel === "Steady" ? "Little match effect" : `Up to ${pay.pressure > 0 ? "+" : "−"}${Math.round(Math.abs(pay.pressure) * PRESSURE_POINTS)} decision pts with no guarantee`}</small></div>
      {fit && <div><span>Team fit</span><strong>{fit.synergy > 0 ? "+" : ""}{fit.synergy} synergy</strong><small>Team rating {fit.teamRating > 0 ? "+" : ""}{fit.teamRating}</small></div>}
      {value.factors.length > 0 && <p>{value.factors.map(f => `${f.label} ${f.effect > 0 ? "+" : ""}${Math.round(f.effect * 100)}%`).join(" · ")}</p>}
    </div>
    {response && <div className="contract-response" role="status" ref={responseRef}>
      <strong>{response.status === "counter" ? `${player.name} counters` : response.status === "accepted" ? "Contract signed" : "Offer not signed"}</strong>
      <p>{response.message}</p>
      {response.counter && <><p><strong>{money(response.counter.wage)} / week{response.counter.prizeShare !== offer.prizeShare ? ` and ${response.counter.prizeShare}% prize share` : ""}</strong>, with your other proposed terms.</p>
        <button type="button" className="button secondary small-button" onClick={() => { setOffer(response.counter!); setResponse(null); }}>Use counteroffer</button></>}
    </div>}
    {editing && <form onSubmit={(e) => {
      e.preventDefault();
      const result = negotiateContract(campaign, player.id, offer);
      setResponse(result);
      if (result.status === "accepted") { onChange(result.campaign); setEditing(false); }
    }}>
      <p className="contract-preference">Gameplay preferences: {preference.practiceHours}h practice, at least {preference.restDays} rest days, and {preference.weeks} weeks of security. Balance these against pay. These are simulated preferences.</p>
      <div className="contract-fields">
        <label>Weekly pay ($)<input type="number" min="0" max="100000" step="1" required value={offer.wage} onChange={(e) => change("wage", Number(e.target.value))} /></label>
        <label>Signing bonus ($)<input type="number" min="0" max="1000000" step="1" required value={offer.bonus} onChange={(e) => change("bonus", Number(e.target.value))} /></label>
        <label>Contract length<select value={offer.weeks} onChange={(e) => change("weeks", Number(e.target.value))}>{[6, 18, 36].map((n) => <option value={n} key={n}>{n} weeks{!campaign.calendar && (n === 18 ? " · one season" : n === 36 ? " · two seasons" : "")}</option>)}</select></label>
        <label>Prize share (%)<input type="number" min="0" max={MAX_PRIZE_SHARE} step="1" required value={offer.prizeShare} onChange={(e) => change("prizeShare", Number(e.target.value))} /></label>
        <label>Weekly practice limit<select value={offer.practiceHours} onChange={(e) => change("practiceHours", Number(e.target.value))}>{[20, 30, 40].map((n) => <option value={n} key={n}>{n} hours / week</option>)}</select></label>
        <label>Protected rest<select value={offer.restDays} onChange={(e) => change("restDays", Number(e.target.value))}>{[1, 2, 3].map((n) => <option value={n} key={n}>{n} {n === 1 ? "day" : "days"} / week</option>)}</select></label>
      </div>
      <div className="contract-effects">
        <p><strong>At full agreed hours:</strong> {offer.practiceHours / 10 - 1} growth per focus attribute before coaching at Normal intensity. {offer.practiceHours > 20 ? `${(offer.practiceHours - 20) * 0.6} extra energy spent on practice. ` : ""}Each rest day above two restores 4 extra energy; one rest day costs 4. Lighter schedules change these effects. A full Rest week overrides practice and restores 24 before staff.</p>
        <p><strong>This offer:</strong> {Math.round(offerGuarantee * 100)}% of market value guaranteed · {offer.prizeShare}% share worth about {money(shareValue(campaign, player, offer.prizeShare))} / wk to {player.name} at {money(expectedWeeklyPrize(campaign))} / wk expected club prize money · the club keeps {100 - othersShare - offer.prizeShare}% of prizes · {offerPressure ? `${offerPressure > 0 ? "+" : ""}${offerPressure} decision pts in competitive matches` : "no pressure effect"}.</p>
        <p>Prize share comes from each event’s gross team earnings, including losses; up to {MAX_PRIZE_SHARE}% per player, so five players can take all of it. The club still pays travel, staff and camps. Pay satisfaction affects weekly happiness: security-minded players lose happiness on thin guarantees even when prizes could pay more. Training respects the agreed practice limit and protected rest days.</p>
        <p>Every agreement requires the player to finish registered tournaments before a transfer or release. Pay continues through the run if the term expires; the renewal morale penalty waits until the run ends. Registered prize shares stay fixed for each tournament.</p>
        <p>Outside a tournament, expired terms continue weekly with a 2-point weekly happiness penalty until renewed. Replacing a player early costs 25% of their remaining fixed wages.</p>
      </div>
      <p className="contract-total"><strong>{money(fees + offer.bonus)} up front</strong> · {money(offer.wage * offer.weeks)} fixed wages over {offer.weeks} weeks, plus prize share.</p>
      {!managed && <p className="field-note">Signing fee {money(fee)}{outgoing ? ` · ${outgoing.name} early release ${money(severance)}` : ""}.</p>}
      {blocker && <p className="field-note" role="status">{blocker}</p>}
      {fees + offer.bonus > 0 && campaign.cash < fees + offer.bonus && <p className="field-note" role="status">Insufficient funds for the up-front cost.</p>}
      <div className="contract-actions">
        <button className="button primary" disabled={!!blocker || (fees + offer.bonus > 0 && campaign.cash < fees + offer.bonus)}>Make offer{!managed ? " & sign if accepted" : " & agree if accepted"}</button>
        {managed && <button type="button" className="button secondary" onClick={() => { setEditing(false); setResponse(null); }}>Cancel</button>}
      </div>
    </form>}
  </section>;
}
