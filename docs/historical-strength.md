# Historical strength and alternate tournament results

October 22, 2026. Implemented locally; not committed or published.

Tournament results should broadly resemble history when strong lineups stay together. Management can change that timeline through signings, development, preparation, results, later invitations and bracket paths. Every played map still ends with an Ancient destroyed by the lane engine.

## Evidence and coverage

The offline compiler retains explicit archived finishing bands in optional `HistoricalTournament.historicalResults`, separately from the advancement graph. It captures source prize-table results before inferred zero-prize elimination bands are added. Existing cached community/Valve sources and attribution remain; no new network collection was required. Rebuild with `python -X utf8 scripts/build-tournaments.py`.

`historical-strength.ts` uses ready events only. It links exact club IDs to five-player roster references, preferring the same source event. Otherwise it chooses the nearest dated reference within 200 days. Year-only observations are eligible in the same year, behind nearby precise observations. Players use exact stored IDs and existing documented aliases, never fuzzy names.

Same-event evidence takes priority. Where it is missing, a player's most recent matched ready event in the preceding 365 days supplies a fading fallback. Future events never supply fallback strength, and old evidence cannot persist indefinitely into future years. Missing matches receive no adjustment. **Annual snapshots are not proof of an exact event lineup.** The outlook displays observation dates and that limitation. This does not complete historical tournament, qualifier or role coverage.

## Strength follows the lineup

Finishing bands supply an illustrative combat adjustment: `max(-0.18, 0.44 - 0.16 × log2(midpoint finish) - tier allowance - qualifier allowance)`. The tier allowance is 0.06 per tier above one, capped at 0.18; qualifiers subtract 0.12. Tied finishes share the midpoint. Prior-event evidence fades linearly over roughly one year.

Seventy-five percent follows individual players, averaged across the registered five. The remaining quarter represents continuity: at least three reference members must remain, scaled by `(retained / 5)³`. A different organization with the same five gets the same evidence. Recruiting a player removes their contribution from the old lineup and brings it to the new one. Existing regional replacement rules fill the rival's vacancy, and actual player attributes also change with the replacement.

The same rules apply to managed, custom and AI teams. Skills, energy, happiness, difficulty and analyst effects remain effective. Attributes are neither rescaled nor overwritten: new players retain their 15–40 starting range and develop normally. Sufficient development and preparation can overcome historical strength. There is no permanent brand bonus or winner override.

## Form and snowball effects

`tournament-form.ts` derives form from actual saved maps. Each match compares played map wins with an expectation based on the registered historical strengths. Beating a favorite moves form more than an expected win. Both sides react, and subsequent opponents encounter the resulting form. This expectation updates form only; it never decides a map.

Each excess expected map win adds 0.018 combat adjustment, with opposite effects for the two lineups. Combined form is capped at ±0.08, has an eight-week half-life and expires after 26 weeks. Its effect follows roster overlap: signing one player carries one fifth of their old five's form. Duplicates count once. Future results and default-win maps supply no form; BO2 draws use their actual maps. No second mutable rating ledger is persisted.

AI workers recompute form after every series. Managed matches and AI workers share the template builder and historical/form functions. Previous-event form reaches workers as compact dated changes, without bundling the source catalogs. Reloaded/split batches produce identical seeded outcomes; watching/skipping still share a computed result.

Unfrozen invitation rankings include historical lineup strength and recent form alongside current ratings and existing tier-weighted completed placements. Frozen invitations, TI1's fixed entry field, qualifier awards and registered fields remain authoritative. Bracket advancement, morale, fatigue, training and transfer consequences retain their existing systems.

**Scope:** simulated registered tournament runs. Events the manager skips or never enters still lack global world-event simulation. This does not add autonomous transfers, full DPC rules, outcomes to unplayed events or historical calibration to fictional legacy weekly events.

## Saves and explanation

Optional `TournamentTeam.strength` stores compact evidence at registration, independently of the team's bracket slot. Existing runs can acquire evidence without changing their rules, dates, finances, attributes or recorded outcomes. Later managed/AI commits retain it for future form calculations. No storage key or campaign version changes.

The calendar and tournament archive include **Historical outlook & campaign form**. Teams show their matched historical event/finish and source, retained player count, roster-observation date, evidence coverage and rising/steady/falling form. Mixed and unknown lineups are explicitly labeled. These are gameplay estimates rather than promised finishing places.

## Validation

Nine new tests cover graded strengths; champions across every ready imported TI, including year-only references; transfers/custom teams; actual signing and regional replacement; form/decay/defaults/duplicates; later-event/invitation effects; worker/config parity and resumed batches; real Ancient-driven favorite/developed-underdog outcomes; and save compatibility with recorded maps. **139 workspace tests pass**, and the production build passes with the existing large-chunk warning.

Eight controlled full TI1 runs with intact lineups gave Na'Vi first and EHOME second in all eight; other placements varied, including upsets among leading teams. This is a calibration sample, not a guaranteed probability. With the same seed, an actual Dendi signing moved Storm Games Clan from 13–16th to 9–12th and changed other placements. Seeded matchup checks also show developed underdogs overcoming favorites.

Browser QA on isolated **5299** confirms AI batches, historical outlook, actual managed playback/skip/settlement, reload persistence and narrow layouts in both themes. Existing campaign origins remain untouched. Ignored previews are `.local/historical-strength-{light,dark}.png`.
