import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, negotiateContract, teamPlayers } from "../src/game";
import type { Campaign, Player } from "../src/game";
import { assessOffer, initialOffer } from "../src/contracts";
import { askingWage, candidateFit, marketValue, playerPersona, prizeShareDemand, signingFee, SYNERGY_BONUS, synergyBonus, teamChemistry } from "../src/player-market";
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentTeamTemplate } from "../src/historical-game";
import { historicalTournaments } from "../src/tournaments";

const base = createCampaign(DEFAULT_SETTINGS);
const freeAgent = (c: Campaign) => c.players.find(p => !c.roster.includes(p.id) && !c.world!.clubs.some(t => t.roster.includes(p.id) || t.bench.includes(p.id)));
const setSkill = (p: Player, n: number) => { for (const key of Object.keys(p.stats)) (p.stats as Record<string, number>)[key] = n; };

test("price follows rank in the player pool, not the roster slot", () => {
  const c = structuredClone(base);
  const [a, b] = c.players.filter(p => p.role === "Carry" && !c.roster.includes(p.id));
  setSkill(a, 60); setSkill(b, 10);
  const strong = marketValue(c, a), weak = marketValue(c, b);
  assert.ok(strong.percentile > 0.95 && weak.percentile < 0.05);
  assert.ok(strong.wage > weak.wage * 4, `${strong.wage} vs ${weak.wage}`);
  assert.ok(strong.fee > weak.fee);
  const wages = new Set(c.players.filter(p => p.role === "Carry").map(p => marketValue(c, p).wage));
  assert.ok(wages.size > 5, "carries no longer share one template price");
});

test("players held by another club cost a buyout on top of the fee", () => {
  const club = base.world!.clubs.find(t => t.id !== base.world!.managedTeamId && t.active !== false)!;
  const held = base.players.find(p => p.id === club.roster[0])!;
  const value = marketValue(base, held);
  assert.ok(value.factors.some(f => f.label === `Buyout from ${club.name}`));
  assert.equal(value.fee, Math.round(value.wage * 9 / 100) * 100);
  assert.equal(signingFee(base, held), value.fee);
});

test("new campaigns pay starters their market value", () => {
  for (const p of teamPlayers(base)) assert.equal(p.wage, marketValue(base, p).wage);
});

test("ego and self-awareness make some players overvalue and others undervalue themselves", () => {
  const personas = base.players.map(p => ({ p, persona: playerPersona(base, p), ratio: askingWage(base, p) / marketValue(base, p).wage }));
  for (const { persona } of personas) {
    assert.ok(persona.ego >= 1 && persona.ego <= 10);
    assert.ok(persona.awareness >= 0.25 && persona.awareness <= 0.95);
  }
  assert.ok(personas.some(r => r.ratio > 1.05), "some ask above market");
  assert.ok(personas.some(r => r.ratio < 0.95), "some ask below market");
  assert.deepEqual(playerPersona(base, base.players[3]), playerPersona(structuredClone(base), base.players[3]), "stable for the same player");
});

test("aware stars who know their leverage ask above market", () => {
  // Make each pool player the single best in the world in turn.
  const aware = base.players.filter(p => !base.roster.includes(p.id)).map(p => {
    const c = structuredClone(base), star = c.players.find(v => v.id === p.id)!;
    setSkill(star, 70);
    return { c, star, persona: playerPersona(c, star) };
  }).filter(r => r.persona.awareness >= 0.6 && r.persona.ego >= 5);
  assert.ok(aware.length > 0);
  for (const { c, star } of aware) assert.ok(askingWage(c, star) > marketValue(c, star).wage, star.name);
  assert.ok(aware.some(r => r.persona.selfImage === "Knows their worth"));
});

test("no prize share demand until the club is winning; stars then demand a cut", () => {
  const star = teamPlayers(base).reduce((a, b) => marketValue(base, a).percentile >= marketValue(base, b).percentile ? a : b);
  assert.equal(prizeShareDemand(base, star), 0);
  const winning = { ...structuredClone(base), reputation: 80 };
  const want = prizeShareDemand(winning, star);
  assert.ok(want >= 1 && want <= 10, String(want));
  const offer = { ...initialOffer(winning, star), wage: star.wage * 3, prizeShare: 0 };
  const reply = assessOffer(winning, star, offer);
  assert.equal(reply.status, "counter");
  assert.equal(reply.counter!.prizeShare, want);
  assert.ok(reply.message.includes(`${want}%`));
  assert.equal(assessOffer(winning, star, reply.counter!).status, "accepted");
  assert.equal(negotiateContract(winning, star.id, reply.counter!).status, "accepted");
});

test("team chemistry scores the lineup and reports each part", () => {
  const chemistry = teamChemistry(base);
  assert.ok(chemistry.synergy >= 0 && chemistry.synergy <= 100);
  assert.deepEqual(chemistry.parts.map(p => p.key), ["style", "lanes", "pool", "communication", "personality", "together"], "innates are absent before 2024");
  for (const part of chemistry.parts) assert.ok(part.score >= 0 && part.score <= part.max, part.key);
  const low = teamChemistry(base, teamPlayers(base)).overall;
  assert.ok(Math.abs(chemistry.teamRating - low) <= Math.ceil(low * 0.1));
});

test("clashing big egos cost synergy", () => {
  const c = structuredClone(base);
  const players = teamPlayers(c);
  const egoIds = c.players.filter(p => playerPersona(c, p).ego >= 8).map(p => p.id);
  const calm = teamChemistry(c).parts.find(p => p.key === "personality")!;
  // Swap in two big-ego players from the pool for the comparison lineup.
  const [x, y] = egoIds.map(id => c.players.find(p => p.id === id)!).filter(p => !c.roster.includes(p.id));
  assert.ok(x && y, "the pool contains big egos");
  const clashing = teamChemistry(c, [...players.slice(0, 3), x, y]).parts.find(p => p.key === "personality")!;
  assert.ok(clashing.detail.includes(`${x.name} and ${y.name} both want to be the star`));
  assert.ok(clashing.score <= 10);
  assert.ok(calm.score <= 15);
});

test("candidate fit compares the lineup with the player swapped in", () => {
  assert.deepEqual(candidateFit(base, teamPlayers(base)[0]), { synergy: 0, teamRating: 0 });
  const recruit = freeAgent(base) ?? base.players.find(p => !base.roster.includes(p.id))!;
  const fit = candidateFit(base, recruit);
  const after = teamChemistry(base, [...teamPlayers(base).filter(p => p.role !== recruit.role), recruit]);
  assert.equal(fit.synergy, after.synergy - teamChemistry(base).synergy);
});

test("synergy becomes a capped combat bonus worth up to five OVR", () => {
  const bonus = synergyBonus(base, base.roster);
  const chemistry = teamChemistry(base);
  assert.ok(Math.abs(bonus) <= SYNERGY_BONUS);
  assert.equal(Math.sign(bonus), Math.sign(chemistry.synergy - 50));
  assert.equal(chemistry.teamRating, Math.round(chemistry.overall + bonus / 0.008));
  assert.equal(synergyBonus(base, base.roster.slice(0, 4)), 0, "incomplete lineups get none");
  assert.equal(synergyBonus(base, [...base.roster.slice(0, 4), "unscouted"]), 0);
});

test("both sides of a legacy event carry their own synergy", () => {
  const config = buildBattleConfig(base, events[0], 7);
  const opponents = config.players[1].map(p => p.id);
  assert.equal(config.bonuses[0], synergyBonus(base, base.roster), "Contender has no difficulty bonus");
  assert.equal(config.bonuses[1], synergyBonus(base, opponents));
});

test("tournament templates add synergy for every club, and lineups count only finished events", () => {
  const ti1 = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
  const c = enableHistoricalCalendar(structuredClone(base));
  c.calendar!.now = c.calendar!.origin = "2011-08-17T00:00:00Z";
  const entered = enterHistoricalTournament(c, ti1.id, 997);
  const run = entered.calendar!.runs[0];
  for (const team of run.teams.filter(t => t.id !== run.managed)) {
    assert.equal(tournamentTeamTemplate(entered, run, team.id).bonus, synergyBonus(entered, team.roster), team.id);
  }
  const managed = run.teams.find(t => t.id === run.managed)!;
  const game = { winner: 0, players: managed.roster.map((id, role) => ({ id, team: 0, heroId: `h${role}` })) };
  const played = structuredClone(entered);
  played.calendar!.runs[0].matches.push({ id: "m", at: "2011-08-17T10:00:00Z", teams: [managed.id, "x"], score: [1, 0], winner: 0, series: { games: [game] } } as never);
  const together = (x: typeof entered) => teamChemistry(x).parts.find(p => p.key === "together")!.detail;
  assert.equal(together(played), together(entered), "a running tournament leaves synergy unchanged");
  const settled = structuredClone(played);
  settled.calendar!.runs[0].settled = true;
  assert.match(together(settled), /^1 competitive map/);
});
