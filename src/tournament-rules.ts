import { seededRandom } from "./battle";
import type { SeriesSummary } from "./battle";
import type { HistoricalTournament, TournamentFixture, TournamentRun, TournamentSlot } from "./tournament-types";
import { hashSeed, utcTime } from "./tournament-utils";

function rulesForRun(run: TournamentRun): HistoricalTournament {
  if (!run.definition) throw new Error("Tournament rules must be registered before simulation.");
  return { ...run.definition, fixtures: run.fixtures };
}

/** AI preparation is an explicit gameplay model: map fatigue and twelve
 * recovery energy per elapsed week. No historical performance is replayed. */
export function tournamentOpponentCondition(run: TournamentRun, team: string, player: { energy: number; happiness: number; stamina: number }, at: string) {
  let energy = player.energy, happiness = player.happiness;
  let previous = utcTime(run.definition?.start ?? run.matches[0]?.at ?? at);
  const recover = (date: string) => {
    const now = utcTime(date);
    energy = Math.min(100, energy + Math.max(0, Math.floor((now - previous) / 604800000)) * 12);
    previous = Math.max(previous, now);
  };
  for (const match of run.matches.filter(m => m.teams.includes(team)).sort((a, b) => utcTime(a.at) - utcTime(b.at))) {
    recover(match.at);
    const advantage = run.fixtures.find(f => f.id === match.id)?.advantage ?? [0, 0];
    const maps = match.score[0] + match.score[1] - advantage[0] - advantage[1];
    energy = Math.max(0, energy - maps * Math.max(1, 4 - player.stamina / 40));
    happiness = Math.max(0, Math.min(100, happiness + (match.winner === null ? 0 : match.teams[match.winner] === team ? 2 : -1)));
  }
  recover(at);
  return { energy, happiness };
}

export function resolveSlot(run: TournamentRun, slot: TournamentSlot): string | undefined {
  if ("team" in slot) return slot.team;
  if ("group" in slot) return run.groupOrder[slot.group]?.[slot.rank - 1];
  const result = run.matches.find(m => m.id === slot.match);
  if (result?.winner == null) return undefined;
  return result.teams[slot.outcome === "winner" ? result.winner : 1 - result.winner];
}
export function fixtureTeams(run: TournamentRun, fixture: TournamentFixture): [string, string] | null {
  const teams = fixture.slots.map(s => resolveSlot(run, s));
  return teams.every(Boolean) ? teams as [string, string] : null;
}
export function nextTournamentFixture(run: TournamentRun): TournamentFixture | undefined {
  if (run.state !== "playing") return undefined;
  const completed = new Set(run.matches.map(m => m.id));
  return run.fixtures.find(f => !completed.has(f.id) && fixtureTeams(run, f));
}
export function managedFixture(run: TournamentRun): TournamentFixture | undefined {
  const next = nextTournamentFixture(run);
  return next && fixtureTeams(run, next)?.includes(run.managed) ? next : undefined;
}

export function groupStandings(run: TournamentRun, groupId: string) {
  const event = rulesForRun(run);
  const group = event?.groups.find(g => g.id === groupId);
  const keys = group?.teams.map(s => resolveSlot(run, s)).filter((s): s is string => !!s) ?? [];
  const records = keys.map(team => ({ team, played: 0, wins: 0, draws: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0 }));
  const fixtures = new Set(run.fixtures.filter(f => f.group === groupId).map(f => f.id));
  for (const match of run.matches.filter(m => fixtures.has(m.id))) {
    match.teams.forEach((team, side) => {
      const row = records.find(r => r.team === team);
      if (!row) return;
      row.played++;
      row.gamesWon += match.score[side]; row.gamesLost += match.score[1 - side];
      row.points += group?.scoring?.[`${match.score[side]}-${match.score[1 - side]}`] ?? (group?.games === 2 ? match.score[side] : match.winner === side ? 1 : match.winner === null ? 0.5 : 0);
      if (match.winner === null) row.draws++;
      else if (match.winner === side) row.wins++;
      else row.losses++;
    });
  }
  return records.sort((a, b) => b.points - a.points || b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost) || a.team.localeCompare(b.team));
}

function completeGroups(run: TournamentRun) {
  const event = rulesForRun(run)!;
  for (const group of event.groups) {
    if (run.groupOrder[group.id]) continue;
    const fixtures = run.fixtures.filter(f => f.group === group.id);
    if (!fixtures.length || fixtures.some(f => !run.matches.some(m => m.id === f.id))) continue;
    const rows = groupStandings(run, group.id);
    if (rows.length !== group.teams.length) continue;
    // A two-way tie is resolved by the actual head-to-head series. Ties that
    // survive it play a BO1 round robin, using the same lane engine.
    const buckets: typeof rows[] = [];
    for (const row of rows) {
      const previous = buckets.at(-1);
      if (previous && previous[0].points === row.points) previous.push(row);
      else buckets.push([row]);
    }
    let pending = false;
    const order: string[] = [];
    let rankOffset = 0;
    for (const bucket of buckets) {
      const offset = rankOffset;
      rankOffset += bucket.length;
      if (bucket.length === 1) { order.push(bucket[0].team); continue; }
      const keys = bucket.map(r => r.team);
      const crossesBoundary = group.tieBreak?.boundaries.some(boundary => offset < boundary && offset + keys.length > boundary);
      const tieId = `tiebreak-${group.id}-${[...keys].sort().join("-")}`;
      const tieFixtures = run.fixtures.filter(f => f.id.startsWith(tieId));
      const tieMatches = run.matches.filter(m => tieFixtures.some(f => f.id === m.id));
      const tieDate = group.end ?? fixtures.at(-1)!.at;
      if (group.tieBreak?.policy === "ti2024" && keys.length === 4) {
        // TI2024's four-way tie is a five-match bracket, not six round-robin
        // games. The random draw seeds fixtures; every placement is played.
        const ids = ["a", "b", "first", "fourth", "middle"].map(id => `${tieId}-${id}`);
        if (!tieFixtures.length) {
          const draw = [...keys].sort((a, b) => hashSeed(`${run.seed}:${a}`) - hashSeed(`${run.seed}:${b}`));
          const win = (i: number): TournamentSlot => ({ match: ids[i], outcome: "winner" });
          const lose = (i: number): TournamentSlot => ({ match: ids[i], outcome: "loser" });
          const slots: [TournamentSlot, TournamentSlot][] = [[{ team: draw[0] }, { team: draw[1] }], [{ team: draw[2] }, { team: draw[3] }], [win(0), win(1)], [lose(0), lose(1)], [lose(2), win(3)]];
          slots.forEach((pair, i) => run.fixtures.push({ id: ids[i], stage: `${group.name} tiebreaker`, label: "BO1 placement tiebreaker", at: tieDate, timeVerified: false, dateVerified: !!group.end, bestOf: 1, slots: pair }));
          pending = true;
        } else if (tieMatches.length === 5) {
          order.push(...[{ match: ids[2], outcome: "winner" }, { match: ids[4], outcome: "winner" }, { match: ids[4], outcome: "loser" }, { match: ids[3], outcome: "loser" }].map(slot => resolveSlot(run, slot as TournamentSlot)!));
        } else pending = true;
        continue;
      }
      if (group.tieBreak?.policy === "ti2024" && keys.length === 3 && offset === 1 && tieFixtures.length) {
        // At 2nd–4th only the top place is contested. Once someone wins twice,
        // an otherwise dead third match is omitted; the other two stay tied.
        const latest = tieFixtures.slice(Math.floor((tieFixtures.length - 1) / 3) * 3);
        const played = tieMatches.filter(m => latest.some(f => f.id === m.id));
        const winner = keys.find(key => played.filter(m => m.winner !== null && m.teams[m.winner] === key).length === 2);
        if (winner) {
          run.fixtures = run.fixtures.filter(f => !latest.some(t => t.id === f.id) || run.matches.some(m => m.id === f.id));
          order.push(winner, ...keys.filter(key => key !== winner).sort((a, b) => hashSeed(`${run.seed}:${a}`) - hashSeed(`${run.seed}:${b}`)));
          continue;
        }
      }
      const headToHead = run.matches.filter(m => fixtures.some(f => f.id === m.id) && m.teams.every(t => keys.includes(t)));
      const miniWins = new Map(keys.map(t => [t, 0]));
      const roundSize = keys.length * (keys.length - 1) / 2;
      const currentRound = tieFixtures.slice(Math.floor((tieFixtures.length - 1) / roundSize) * roundSize);
      const latestMatches = group.tieBreak?.policy === "ti2024" ? tieMatches.filter(m => currentRound.some(f => f.id === m.id)) : tieMatches;
      for (const match of tieFixtures.length ? latestMatches : headToHead) {
        match.teams.forEach((key, side) => miniWins.set(key, miniWins.get(key)! + match.score[side] - match.score[1 - side]));
      }
      let sorted = [...keys].sort((a, b) => miniWins.get(b)! - miniWins.get(a)!);
      let resolved = new Set(sorted.map(t => miniWins.get(t))).size === keys.length;
      // TI's published non-boundary rules use results against successively
      // lower seeds, then a coin toss. This only seeds teams; it never wins a map.
      if (group.tieBreak && !crossesBoundary && !tieFixtures.length) {
        const lower = rows.filter(row => row.points < bucket[0].points);
        const vector = (key: string) => [miniWins.get(key)!, ...(group.tieBreak?.lowerSeedWins ? lower.map(row =>
          run.matches.filter(m => fixtures.some(f => f.id === m.id) && m.teams.includes(key) && m.teams.includes(row.team)).reduce((n, m) => n + m.score[m.teams.indexOf(key)], 0)) : [])];
        const compare = (a: string, b: string) => {
          const av = vector(a), bv = vector(b);
          for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return bv[i] - av[i];
          return group.tieBreak?.coinToss ? seededRandom(hashSeed(`${run.seed}:${group.id}:${a}`))() - seededRandom(hashSeed(`${run.seed}:${group.id}:${b}`))() || a.localeCompare(b) : 0;
        };
        sorted = [...keys].sort(compare);
        resolved = sorted.every((key, i) => !i || compare(sorted[i - 1], key) !== 0);
      }
      if (crossesBoundary && !tieFixtures.length) resolved = false;
      if (resolved && (!tieFixtures.length || tieFixtures.length === tieMatches.length)) { order.push(...sorted); continue; }
      if (!tieFixtures.length) {
        for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
          const bestOf = keys.length === 2 ? group.tieBreak?.twoTeamBestOf ?? 1 : 1;
          run.fixtures.push({ id: `${tieId}-${a}-${b}`, stage: `${group.name} tiebreaker`, label: `BO${bestOf} tiebreaker`, at: group.end ?? fixtures.at(-1)!.at, timeVerified: false, dateVerified: !!group.end, bestOf,
            slots: [{ team: keys[a] }, { team: keys[b] }] });
        }
        pending = true;
      } else if (tieFixtures.length !== tieMatches.length) pending = true;
      else {
        // A circular tiebreaker requires another round; no random winner roll.
        const round = tieFixtures.length / (keys.length * (keys.length - 1) / 2);
        for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
          run.fixtures.push({ id: `${tieId}-repeat-${round}-${a}-${b}`, stage: `${group.name} tiebreaker`, label: "BO1 repeat tiebreaker", at: fixtures.at(-1)!.at, timeVerified: false, bestOf: 1,
            slots: [{ team: keys[a] }, { team: keys[b] }] });
        }
        pending = true;
      }
    }
    if (!pending) run.groupOrder[group.id] = order;
  }
}

export function validateSeries(fixture: TournamentFixture, series: SeriesSummary) {
  const advantage = fixture.advantage ?? [0, 0];
  const counts = [0, 1].map(side => series.games.filter(g => g.winner === side).length + advantage[side]);
  const max = Math.floor(fixture.bestOf / 2) + 1;
  const winner = counts[0] === counts[1] ? null : counts[0] > counts[1] ? 0 : 1;
  if (series.engine !== "lane-siege-v1" || series.games.some(g => g.winner !== 0 && g.winner !== 1) || counts.some((n, i) => n !== series.score[i]) || winner !== series.winner ||
      (fixture.bestOf === 2 ? series.games.length !== 2 : winner == null || counts[winner] !== max || counts[1 - winner] >= max || !series.games.length || series.games.at(-1)!.winner !== winner || series.games.slice(0, -1).filter(g => g.winner === winner).length + advantage[winner] >= max))
    throw new Error("The series result does not match this tournament fixture.");
}

export function recordTournamentSeries(current: TournamentRun, fixtureId: string, series: SeriesSummary): TournamentRun {
  if (current.matches.some(m => m.id === fixtureId)) return current;
  const fixture = nextTournamentFixture(current);
  if (!fixture || fixture.id !== fixtureId) throw new Error("This fixture is not ready to play.");
  const teams = fixtureTeams(current, fixture)!;
  const names = teams.map(id => current.teams.find(t => t.id === id)?.name);
  const reversed = names[1] === series.teams[0] && names[0] === series.teams[1];
  const normalized = reversed ? { ...series, teams: [...series.teams].reverse() as [string, string], score: [...series.score].reverse() as [number, number], winner: series.winner === null ? null : 1 - series.winner as 0 | 1,
    games: series.games.map(g => ({ ...g, winner: 1 - g.winner as 0 | 1 })) } : series;
  if (normalized.teams[0] !== names[0] || normalized.teams[1] !== names[1]) throw new Error("The result belongs to different teams.");
  if (current.patchId && series.patch && current.patchId !== series.patch.id) throw new Error("The result used a different tournament patch.");
  validateSeries(fixture, normalized);
  const run = structuredClone(current);
  if (!run.patchId && series.patch) run.patchId = series.patch.id;
  run.matches.push({ id: fixtureId, teams, score: normalized.score, winner: normalized.winner, at: fixture.at,
    ...(teams.includes(run.managed) ? { series } : { performance: {
      teams: [...series.teams] as [string, string],
      ...(series.patch ? { patch: series.patch } : {}),
      games: series.games.map(({ winner, duration, kills, players }) => ({ winner, duration, kills, players })),
    } }) });
  completeGroups(run);
  if (!nextTournamentFixture(run)) {
    const event = rulesForRun(run)!;
    const finished = event.placements.map(p => ({ team: resolveSlot(run, p.slot), ...p })).filter(p => p.team);
    if (finished.length !== run.teams.length || new Set(finished.map(p => p.team)).size !== run.teams.length)
      throw new Error("The tournament cannot finish: its advancement graph has unresolved placements.");
    run.placements = finished.map(p => {
      const reward = event.prizes.find(r => r.from === p.from && r.to === p.to);
      return { team: p.team!, from: p.from, to: p.to, prize: reward?.usd ?? 0, points: reward?.points ?? 0 };
    });
    run.state = "complete";
  }
  return run;
}

export function seededTournamentFixtures(event: HistoricalTournament, seed: number): TournamentFixture[] {
  const fixtures = structuredClone(event.fixtures);
  // Randomness only seeds otherwise simultaneous group fixtures. It never
  // decides wins, placements or qualification.
  const random = seededRandom(seed);
  const stageOrder = new Map(event.groups.map((g, i) => [g.id, i]));
  return fixtures.map(f => ({ f, sort: random() })).sort((a, b) =>
    utcTime(a.f.at) - utcTime(b.f.at) ||
    (a.f.group ? stageOrder.get(a.f.group)! : event.groups.length) - (b.f.group ? stageOrder.get(b.f.group)! : event.groups.length) ||
    (a.f.group && b.f.group ? a.sort - b.sort : 0)).map(({ f }) => f);
}
