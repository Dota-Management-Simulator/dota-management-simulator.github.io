import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { tournamentPasses, tournamentPassForMenu, passTournaments, passTournamentData } from "../src/tournament-pass";
import { menuEvents } from "../src/menu-events";
import { historicalTournaments } from "../src/tournaments";
import type { Campaign } from "../src/game";
import type { TournamentRun } from "../src/tournament-types";

test("every advertised pass has artwork and a tournament guide, including the postponed TI10", () => {
  const campaign = { calendar: undefined };
  assert.equal(new Set(tournamentPasses.map(pass => pass.id)).size, tournamentPasses.length);
  for (const pass of tournamentPasses) {
    assert.ok(existsSync(`public/dota-menu/${pass.art}`), pass.id);
    const events = passTournaments(pass, campaign);
    assert.ok(events.length > 0, pass.id);
    assert.ok(events.every(event => pass.eventId ? event.id === pass.eventId : event.start <= pass.to && event.end >= pass.from));
    assert.equal(tournamentPassForMenu(pass.from, pass.art)?.id, pass.id);
  }
  const postponed = passTournaments(tournamentPasses.find(pass => pass.id === "ti10-2020")!, campaign);
  assert.equal(postponed.length, 1);
  assert.equal(postponed[0].year, 2021);
  assert.ok(!historicalTournaments.some(event => event.kind === "ti" && event.year === 2020));
});

test("event archives keep their own pass and normal news never opens an unrelated pass", () => {
  for (const [eventId, passId] of [["siltbreaker", "ti-2017"], ["underhollow", "ti-2018"], ["labyrinth", "ti10-2020"], ["nemestice", "nemestice"], ["diretide", "ti-2022"]]) {
    const event = menuEvents.find(event => event.id === eventId)!;
    assert.equal(tournamentPassForMenu("2026-07-13", "update-largo.jpg", undefined, event, true)?.id, passId);
  }
  assert.equal(tournamentPassForMenu("2015-09-09", "update-reborn.jpg"), undefined);
  assert.equal(tournamentPassForMenu("2026-07-13", "update-largo.jpg"), undefined);
  assert.equal(tournamentPassForMenu("2026-07-13", "update-ti9bp.jpg", undefined, menuEvents.find(event => event.id === "darkmoon"), true), undefined);
});

test("pass pages preserve pinned campaign rules, changed fields and recorded results without mutating the save", () => {
  const pass = tournamentPasses.find(pass => pass.id === "ti-2016")!;
  const reference = passTournaments(pass, { calendar: undefined })[0];
  const fixture = { ...reference.fixtures[0], id: "campaign-fixture" };
  const run = {
    eventId: reference.id, managed: "custom-club", state: "complete", teams: [{ id: "custom-club", name: "My custom club", roster: [] }, { id: "rival", name: "Campaign rival", roster: [] }],
    fixtures: [fixture], matches: [{ id: fixture.id, teams: ["custom-club", "rival"], score: [2, 0], winner: 0, at: fixture.at }],
    placements: [{ team: "custom-club", from: 1, to: 1, prize: 12345, points: 0 }],
    definition: { ...reference, pool: 12345, location: "Pinned venue" },
  } as TournamentRun;
  const campaign = { calendar: { runs: [run] } } as Campaign;
  const before = JSON.stringify(campaign);
  const event = passTournaments(pass, campaign)[0];
  assert.equal(event.pool, 12345);
  assert.equal(event.location, "Pinned venue");
  const data = passTournamentData(event, campaign);
  assert.deepEqual(data.teams, [{ id: "custom-club", name: "My custom club", managed: true }, { id: "rival", name: "Campaign rival", managed: false }]);
  assert.equal(data.matches[0].winner, 0);
  assert.equal(data.fixtures[0].id, "campaign-fixture");
  assert.equal(data.run?.placements[0].prize, 12345);
  assert.equal(JSON.stringify(campaign), before);
  const noRun = passTournamentData(reference, { calendar: undefined });
  assert.deepEqual(noRun.matches, []);
  assert.ok(noRun.teams.every(team => !team.managed));
});
