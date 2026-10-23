import type { TournamentRun } from "./tournament-types";
import { formatDate } from "./tournament-utils";
import { bracketSlot, BRACKET_CARD_HEIGHT, BRACKET_CARD_WIDTH, tournamentBrackets } from "./tournament-bracket";

export default function TournamentBracket({ run, onSeries, busy = false }: { run: TournamentRun; onSeries?: (id: string) => void; busy?: boolean }) {
  const brackets = tournamentBrackets(run);
  if (!brackets.length) return null;
  return <div className="tournament-brackets">{brackets.map(bracket => !bracket.reached ? <p className="field-note" key={bracket.stage}>{bracket.stage} bracket will appear when your tournament reaches that stage.</p> : <section className="tournament-bracket" key={bracket.stage} aria-label={`${bracket.stage} bracket`}>
    <h3>{bracket.stage} bracket</h3><p className="field-note">Follow the paths from left to right. Solid lines advance winners; dashed lines carry losing teams. Scroll to follow later rounds.</p>
    <div className="bracket-scroll" role="region" aria-label={`${bracket.stage} bracket rounds`} tabIndex={0}>
      <div className="bracket-canvas" style={{ width: bracket.width, height: bracket.height }}>
        <svg className="bracket-paths" width={bracket.width} height={bracket.height} aria-hidden="true">{bracket.edges.map(edge => {
          const x = edge.from.x + BRACKET_CARD_WIDTH, y = edge.from.y + BRACKET_CARD_HEIGHT / 2;
          const endX = edge.to.x, endY = edge.to.y + (edge.side === 0 ? 77 : 123);
          const middle = x + 22;
          return <path key={`${edge.from.fixture.id}:${edge.to.fixture.id}:${edge.side}`} className={edge.outcome} d={`M${x},${y} H${middle} V${endY} H${endX}`} />;
        })}</svg>
        {Array.from({ length: bracket.columns }, (_, i) => <span key={i} className="bracket-column-title" style={{ left: i * 304 }}>Round {i + 1}</span>)}
        {bracket.nodes.map(node => {
          const f = node.fixture, result = run.matches.find(m => m.id === f.id);
          const next = bracket.nextId === f.id;
          const hasScoreboard = !!(result?.series?.games.length || result?.performance?.games.length);
          return <article key={f.id} className={`bracket-match ${next ? "bracket-next" : ""}`} style={{ left: node.x, top: node.y, width: BRACKET_CARD_WIDTH, height: BRACKET_CARD_HEIGHT }} aria-label={`M${node.number}: ${f.label}${next ? ", next series" : ""}`}>
            <header><strong>M{node.number} · {f.label.replace(/\s*\(Bo\d+\)/gi, "")}</strong><span>BO{f.bestOf} · {result ? "Final" : next ? "Next series" : "Upcoming"}</span></header>
            {f.slots.map((slot, side) => {
              const entry = bracketSlot(run, bracket.fixtures, slot);
              const key = result?.teams[side] ?? entry.key;
              const name = run.teams.find(t => t.id === key)?.name ?? entry.name;
              return <div key={side} className={`bracket-team ${key === run.managed ? "managed-row" : ""} ${result?.winner === side ? "bracket-winner" : ""}`}>
                <span><strong title={name}>{name}</strong><small title={entry.source}>{entry.source}</small></span><b>{result ? result.score[side] : f.advantage?.some(Boolean) ? f.advantage[side] : "–"}</b>
              </div>;
            })}
            <footer><time>{formatDate(f.at, f.timeVerified)}{!f.dateVerified ? " · Est." : ""}</time>{onSeries && hasScoreboard && <button className="text-link" disabled={busy} aria-label={`Scoreboards for M${node.number}: ${f.label}`} onClick={() => onSeries(f.id)}>Scoreboards</button>}{!hasScoreboard && f.advantage?.some(Boolean) && <small>Includes default win</small>}</footer>
          </article>;
        })}
      </div>
    </div>
  </section>)}</div>;
}
