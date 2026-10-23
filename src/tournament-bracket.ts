import { nextTournamentFixture, resolveSlot } from "./tournament-rules";
import type { TournamentFixture, TournamentRun, TournamentSlot } from "./tournament-types";

export const BRACKET_CARD_WIDTH = 250;
export const BRACKET_CARD_HEIGHT = 200;
const COLUMN_STEP = 304, ROW_STEP = 224, HEADER = 40;

/** Reveal a stage when play actually reaches it, including dynamically added tiebreaks. */
export function tournamentBrackets(run: TournamentRun) {
  const next = nextTournamentFixture(run);
  const played = new Set(run.matches.map(m => m.id));
  const stages = [...new Set(run.fixtures.filter(f => !f.group).map(f => f.stage))];
  return stages.map(stage => {
    const fixtures = run.fixtures.filter(f => !f.group && f.stage === stage);
    const reached = run.state === "complete" || next?.stage === stage || fixtures.some(f => played.has(f.id));
    const depths = new Map<string, number>();
    const depth = (fixture: TournamentFixture, visiting = new Set<string>()): number => {
      if (depths.has(fixture.id)) return depths.get(fixture.id)!;
      if (visiting.has(fixture.id)) return 0;
      const ancestors = new Set([...visiting, fixture.id]);
      const parents = fixture.slots.flatMap(s => "match" in s ? fixtures.filter(f => f.id === s.match) : []);
      const value = parents.length ? 1 + Math.max(...parents.map(f => depth(f, ancestors))) : 0;
      depths.set(fixture.id, value);
      return value;
    };
    fixtures.forEach(f => depth(f));
    const columns = Array.from({ length: Math.max(0, ...depths.values()) + 1 }, (_, i) => fixtures.filter(f => depths.get(f.id) === i));
    const rows = Math.max(1, ...columns.map(c => c.length));
    const nodes = columns.flatMap((column, level) => column.map((fixture, row) => ({
      fixture, level, number: fixtures.indexOf(fixture) + 1,
      x: level * COLUMN_STEP, y: HEADER + ((row + 0.5) * rows / column.length) * ROW_STEP - BRACKET_CARD_HEIGHT / 2,
    })));
    const edges = nodes.flatMap(node => node.fixture.slots.flatMap((slot, side) => {
      const parent = "match" in slot ? nodes.find(n => n.fixture.id === slot.match) : undefined;
      return parent && "outcome" in slot ? [{ from: parent, to: node, side, outcome: slot.outcome }] : [];
    }));
    return { stage, reached, fixtures, nodes, edges, columns: columns.length, width: (columns.length - 1) * COLUMN_STEP + BRACKET_CARD_WIDTH, height: HEADER + rows * ROW_STEP, nextId: next?.id };
  });
}

export function bracketSlot(run: TournamentRun, fixtures: TournamentFixture[], slot: TournamentSlot) {
  const key = resolveSlot(run, slot);
  const team = run.teams.find(t => t.id === key);
  const source = "match" in slot ? `${slot.outcome === "winner" ? "Winner" : "Loser"} of M${fixtures.findIndex(f => f.id === slot.match) + 1}`
    : "group" in slot ? `${run.definition?.groups.find(g => g.id === slot.group)?.name ?? slot.group} · #${slot.rank}` : "Seeded team";
  // Cross-stage references use the recorded round instead of an invented match number.
  const crossStage = "match" in slot && !fixtures.some(f => f.id === slot.match);
  return { key, name: team?.name ?? key ?? "To be decided", source: crossStage && "match" in slot ? `${slot.outcome === "winner" ? "Winner" : "Loser"}: ${run.fixtures.find(f => f.id === slot.match)?.label ?? slot.match}` : source };
}
