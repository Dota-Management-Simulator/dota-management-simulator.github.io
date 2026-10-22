import { useEffect, useRef, useState } from "react";
import { money, negotiateContract, recruitmentBlocker, teamPlayers } from "./game";
import type { Campaign, Player } from "./game";
import { contractPreferences, initialOffer, releaseCost, weeksRemaining } from "./contracts";
import type { ContractOffer } from "./contracts";
import "./contracts.css";
import { playerTournamentLock } from "./tournament-locks";

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
  const preference = contractPreferences(player);
  const outgoing = managed ? undefined : teamPlayers(campaign).find((p) => p.role === player.role);
  const severance = outgoing ? releaseCost(campaign, outgoing.id) : 0;
  const fees = managed ? 0 : player.fee + severance;
  const blocker = managed ? null : recruitmentBlocker(campaign, player.id);
  const change = (key: keyof ContractOffer, value: number) => {
    setOffer((o) => ({ ...o, [key]: value }));
    setResponse(null);
  };
  return <section className="contract-panel" aria-label="Player contract">
    <div className="contract-heading">
      <div>
        <h3>{managed ? "Player contract" : "Negotiate a signing"}</h3>
        <p>{managed ? contract ? remaining ? `${remaining} weeks left · ${money(player.wage)} / week` : tournamentLock ? "Contract extended through the current tournament" : "Renewal due · terms continue week to week" : `Rolling weekly agreement · ${money(player.wage)} / week` : `Replaces ${outgoing?.name ?? "the starter in this position"}.`}</p>
      </div>
      {!editing && <button className="button secondary small-button" onClick={() => {
        setOffer(initialOffer(campaign, player)); setResponse(null); setEditing(true);
      }}>Negotiate terms</button>}
    </div>
    {managed && contract && <p className="contract-summary">Up to {contract.practiceHours}h practice · at least {contract.restDays} rest days / week · {contract.prizeShare}% prize share · {money(releaseCost(campaign, player.id))} early release</p>}
    {tournamentLock && <p className="contract-summary">Tournament commitment: players finish their registered run before transfers or releases. Pay continues after expiry, with no renewal morale penalty during the run. Registered prize shares remain fixed for this tournament.</p>}
    {response && <div className="contract-response" role="status" ref={responseRef}>
      <strong>{response.status === "counter" ? `${player.name} counters` : response.status === "accepted" ? "Contract signed" : "Offer not signed"}</strong>
      <p>{response.message}</p>
      {response.counter && <><p><strong>{money(response.counter.wage)} / week</strong>, with your other proposed terms.</p>
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
        <label>Weekly pay ($)<input type="number" min="50" max="100000" step="1" required value={offer.wage} onChange={(e) => change("wage", Number(e.target.value))} /></label>
        <label>Signing bonus ($)<input type="number" min="0" max="1000000" step="1" required value={offer.bonus} onChange={(e) => change("bonus", Number(e.target.value))} /></label>
        <label>Contract length<select value={offer.weeks} onChange={(e) => change("weeks", Number(e.target.value))}>{[6, 18, 36].map((n) => <option value={n} key={n}>{n} weeks{!campaign.calendar && (n === 18 ? " · one season" : n === 36 ? " · two seasons" : "")}</option>)}</select></label>
        <label>Prize share (%)<input type="number" min="0" max="10" step="1" required value={offer.prizeShare} onChange={(e) => change("prizeShare", Number(e.target.value))} /></label>
        <label>Weekly practice limit<select value={offer.practiceHours} onChange={(e) => change("practiceHours", Number(e.target.value))}>{[20, 30, 40].map((n) => <option value={n} key={n}>{n} hours / week</option>)}</select></label>
        <label>Protected rest<select value={offer.restDays} onChange={(e) => change("restDays", Number(e.target.value))}>{[1, 2, 3].map((n) => <option value={n} key={n}>{n} {n === 1 ? "day" : "days"} / week</option>)}</select></label>
      </div>
      <div className="contract-effects">
        <p><strong>At full agreed hours:</strong> {offer.practiceHours / 10 - 1} growth per focus attribute before coaching at Normal intensity. {offer.practiceHours > 20 ? `${(offer.practiceHours - 20) * 0.6} extra energy spent on practice. ` : ""}Each rest day above two restores 4 extra energy; one rest day costs 4. Lighter schedules change these effects. A full Rest week overrides practice and restores 24 before staff.</p>
        <p>Prize share comes from each event’s gross team earnings, including losses. Pay satisfaction affects weekly happiness. Training respects the agreed practice limit and protected rest days.</p>
        <p>Every agreement requires the player to finish registered tournaments before a transfer or release. Pay continues through the run if the term expires; the renewal morale penalty waits until the run ends. Registered prize shares stay fixed for each tournament.</p>
        <p>Outside a tournament, expired terms continue weekly with a 2-point weekly happiness penalty until renewed. Replacing a player early costs 25% of their remaining fixed wages.</p>
      </div>
      <p className="contract-total"><strong>{money(fees + offer.bonus)} up front</strong> · {money(offer.wage * offer.weeks)} fixed wages over {offer.weeks} weeks, plus prize share.</p>
      {!managed && <p className="field-note">Signing fee {money(player.fee)}{outgoing ? ` · ${outgoing.name} early release ${money(severance)}` : ""}.</p>}
      {blocker && <p className="field-note" role="status">{blocker}</p>}
      {fees + offer.bonus > 0 && campaign.cash < fees + offer.bonus && <p className="field-note" role="status">Insufficient funds for the up-front cost.</p>}
      <div className="contract-actions">
        <button className="button primary" disabled={!!blocker || (fees + offer.bonus > 0 && campaign.cash < fees + offer.bonus)}>Make offer{!managed ? " & sign if accepted" : " & agree if accepted"}</button>
        {managed && <button type="button" className="button secondary" onClick={() => { setEditing(false); setResponse(null); }}>Cancel</button>}
      </div>
    </form>}
  </section>;
}
