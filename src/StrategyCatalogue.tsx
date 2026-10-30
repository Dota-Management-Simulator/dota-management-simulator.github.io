import { useMemo, useState } from 'react';
import type { BattleConfig } from './battle';
import { gamePhases, phaseLabels, strategies, strategyUnlocked, unlockDescription } from './tactics';
import type { GamePhase } from './tactics';
import './strategy-catalogue.css';

type CatalogueConfig = Pick<BattleConfig, 'players' | 'patchObservers' | 'tacticalUnlocks'>;
const roles = ['Carry', 'Mid', 'Offlane', 'Soft support', 'Hard support'];
export default function StrategyCatalogue({ config, onEquip }: { config: CatalogueConfig; onEquip?: (phase: GamePhase, id: string, slot: number) => void }) {
  const [query, setQuery] = useState(''), [access, setAccess] = useState('all');
  const [phase, setPhase] = useState<GamePhase>('mid'), [slot, setSlot] = useState(0);
  const staff = config.patchObservers?.[0]?.staffIds ?? [], earned = config.tacticalUnlocks?.[0] ?? [];
  const available = (id: string) => strategyUnlocked(strategies.find(s => s.id === id)!, config.players[0], staff, earned);
  const rows = useMemo(() => strategies.filter(s => {
    const unlocked = strategyUnlocked(s, config.players[0], staff, earned);
    return (access === 'all' || unlocked === (access === 'available')) && `${s.name} ${s.description} ${unlockDescription(s)}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [query, access, config.players, staff, earned]);
  return <details className="strategy-catalogue">
    <summary>Call catalogue · {strategies.filter(s => available(s.id)).length}/{strategies.length} available</summary>
    <p>Equip three calls per phase. Competitive series victories permanently teach club calls. Specialist access lasts while the coach is employed. Practice and exhibitions do not earn victory unlocks.</p>
    <div className="strategy-catalogue-filters">
      <label>Find a call<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search calls or unlock routes" /></label>
      <label>Access<select value={access} onChange={e => setAccess(e.target.value)}><option value="all">All calls</option><option value="available">Available</option><option value="locked">Locked</option></select></label>
      {onEquip && <><label>Equip phase<select value={phase} onChange={e => setPhase(e.target.value as GamePhase)}>{gamePhases.map(p => <option value={p} key={p}>{phaseLabels[p]}</option>)}</select></label><label>Quick slot<select value={slot} onChange={e => setSlot(Number(e.target.value))}>{[0, 1, 2].map(i => <option value={i} key={i}>{i + 1}</option>)}</select></label></>}
    </div>
    <div className="strategy-catalogue-grid">{rows.map(s => {
      const unlocked = available(s.id), learned = earned.includes(s.id);
      return <article key={s.id} className={unlocked ? 'available' : 'locked'}><div className="strategy-catalogue-title"><h4>{s.name}</h4><span>{learned ? 'Learned permanently' : unlocked ? 'Available' : 'Locked'}</span></div><p>{s.description}</p><small>Players: {s.roles.map(r => roles[r]).join(', ')}</small><small>Phases: {s.phases.map(p => p === 'early' ? 'Early' : p === 'mid' ? 'Mid' : 'Late').join(', ')}</small><p className="strategy-unlock"><strong>Unlock:</strong> {unlockDescription(s)}</p>{onEquip && <button type="button" className="button secondary" disabled={!unlocked || !s.phases.includes(phase)} onClick={() => onEquip(phase, s.id, slot)}>{!unlocked ? 'Locked' : !s.phases.includes(phase) ? 'Choose a supported phase' : `Equip slot ${slot + 1}`}</button>}</article>;
    })}</div>
    {!rows.length && <p role="status">No calls match these filters.</p>}
  </details>;
}
