# Product vision and future plans

**October 22, 2026 — tournament work in progress:** the user approved major/tier-2 events and qualifiers, actual dates/times, era-specific qualification, full groups/brackets, placement payouts and tournament completion in all player contracts. The dated engine and 483 catalog records are local; 112 pass current stage/topology/payout checks. TI2011–2019, TI2021/2022 and TI2024 have main fields/groups/brackets. TI2023's recovered stages remain locked pending its tiebreak policy. A checked-in Valve cache now supplements the rate-limited community archive. The complete archive, most qualifiers, 2020 events, Swiss, world-event simulation and full DPC rules remain outstanding; see [coverage and limitations](tournaments.md). The partner's research is retained with date/currency corrections. No deployment has been made.

Context preserved from the user's design discussions and subsequent implementation choices. Last updated **2026-10-21**. This is a design backlog, not an instruction to build all of it or a promised implementation schedule. Start with [AGENTS.md](../AGENTS.md) for the current application and deployment.

## Explicit decisions already made

- Build a browser application with separate files/data/simulation modules, rather than only a standalone HTML file.
- Begin with a clean management scaffold and dummy players/stats, then incrementally fill in systems. The user likes the current UI.
- Include campaign setup, difficulty and a starting-era choice; the earliest/classic start is The International in 2011.
- Use real Dota hero names; keep initial balance values illustrative rather than claiming validated historical stats.
- Adapt the old lane simulation to determine results, show a watchable simulation, and allow skipping it.
- Results should show series scores, **K/D/A per hero, levels, and gold and XP graphs over the game**.
- Simulation heroes now use actual Valve minimap icons, with matching live-roster and scoreboard artwork. All 127 icons are bundled locally with exact hero-ID mapping, team rings, health bars and initials fallbacks. Modern artwork is not era-specific. This visual change remains local, not deployed; see [simulation notes](simulation.md).
- Use the 46 TI1-contested heroes at the opening, then add Dota 2 heroes in calendar-year batches at post-TI shuffles through 2026. This game rule includes late-year releases and is independent of Captain's Mode eligibility.
- Support dark mode and remember the preference.
- Training must offer every player-card attribute and playstyle, plus happiness and energy recovery, and player cards must open their profiles directly from Training. Implemented locally with grouped choices, weekly-effect previews and existing-save compatibility.
- Training now includes Light/Normal/Intense intensity, hours/day and days/week per player. More hours/intensity increase development and energy use; schedules respect contracted weekly-hour limits and protected rest. See [training rules](training.md) for formulas, previews and save compatibility.
- Sponsors now have a local sourced era catalog with 42 brands from Dota and other esports. The user requested global brand exclusivity, up to five sponsors per team, expiry before switching clubs, negotiation and sponsor-specific benefits. Implemented locally with simulated AI ownership, support/bonus/duration/media negotiations, fixed expiry, weekly effects and legacy-save compatibility. Real associations do not establish continuous contracts from 2012; current-only evidence uses conservative catalog years. See [sponsor rules and source ledger](sponsors.md).
- Publish the source publicly under the user's GitHub organization and host on GitHub Pages. The actual organization is **Dota-Management-Simulator**, owned by **Jonahbyu**; the earlier proposed name Dota-Team-Manager was superseded.
- Populate real players and teams in annual increments from 2011 through the present, including regional/tier-2 players. Load annual updates during the post-TI shuffle. Three era-specific signature heroes per player are deferred.
- Historical teams make up the world. Manage an original TI1 team or replace one with a custom club. Recruiting another club's player makes that club find an available regional replacement.
- Show historical team logos according to era, including sourced branding changes. The local implementation bundles 473 images for 408 of 463 club IDs; 55 unverified clubs use initials. Logo selection uses the displayed season or result year, with annual snapshot precision. Custom clubs use their own initials. See [team logo coverage](team-logos.md).
- Add as many sourced player photos as practical, including sources beyond Wikimedia. The local collection covers 1,022 identity records using 907 distinct source photos from Commons, Liquipedia and Spectral player cards. Exact player-ID matching, silhouette fallbacks and source/rights credits remain. These are single reference appearances, not year-by-year photos. The expansion has mixed rights, including Liquipedia-only restrictions and unverified reuse permission; it is not blanket publication clearance and remains local. See [portrait coverage and sources](player-portraits.md).

The initial request to avoid building was superseded by explicit requests to build the scaffold, add features and publish. It is not an ongoing prohibition. Conversely, the future concepts below are not blanket approval for a wholesale rebuild.

The user subsequently requested negotiation of pay/contracts and non-monetary commitments such as practice time. The local implementation now includes offers and counteroffers for current players and recruits, with weekly pay, bonuses, fixed duration, prize share, practice hours and protected rest days. Terms affect payroll, morale, development, energy, prize payouts and early replacement costs. Expiry retains the five on weekly terms pending renewal. See [contract mechanics](contracts.md).

## 1. Campaign: an alternate Dota history

### Requested vision

- Start at TI1 and support progression through TI26, then continue into future seasons with generated players and patches.
- Each TI ends a season, with tournaments and qualification leading up to it.
- **Making TI is not guaranteed.** Missing it should be a real, understandable campaign outcome.
- Historical rosters should be a starting framework. Management changes and different results can produce different TI champions and names on the Aegis.
- Post-TI roster shuffle is a major management period. Moves should resemble history with chances to diverge as the player's timeline changes.

### Present limits

The selector offers calendar years 2011–2036 with a compact 18-week/five-event placeholder calendar. Annual player/team imports cover 2011–2026, including TI fields and selected regional/closed qualifier references. The database grows from 100 opening identities/19 clubs to 1,641 identities through 2026. Hero releases grow from 46 opening heroes to 127. Later starts use completed prior-year batches. All original TI1 clubs and later reference clubs can be managed or replaced with a custom club. Imports preserve the manager's five/signings; regional replacements reconcile overlapping references. AI clubs outside later annual fields are archived without claiming historical disbandment. See [historical roster notes](historical-rosters.md) for sources, precision and coverage limits. Individual roles, exhaustive tier-2 coverage, retirement, historical events, accurate TI numbering and procedural generation remain pending. No historical TI occurred in 2020; its roster import uses online events while the game's separate calendar remains a placeholder.

### Decisions still needed

- Calendar/season granularity and the intended relationship between start year, TI edition and actual event dates.
- How faithfully qualification rules change by era versus a simplified unified system.
- How results, finances, reputation and relationships affect historical transfers, team formation, retirement and future generation.
- Resolved: both historical clubs and a custom replacement club are supported. Further decisions concern contracts, retirement and how later historical batches interact with the alternate timeline.

## 2. Tournament scheduling and preparation

The core tradeoff requested by the user is choosing **which tournaments to enter and when to bootcamp or rest**:

- Play to gain practice, confidence, money, qualification progress and momentum.
- Rest to recover stamina/readiness.
- Hide strategies so opponents have less information before important events.
- Bootcamp to develop skills, hero comfort, coordination or a new playstyle, at a stamina/financial cost.
- Arrive at qualifiers and TI prepared rather than automatically participating in everything.

Current weekly training/rest, event skips and elapsed-week finances provide a foundation. Team bootcamps, strategy secrecy, opponent scouting knowledge, explicit momentum, and richer fatigue scheduling remain to be designed. Avoid making one preparation option universally optimal.

## 3. Player attributes and development

Preserve the user's intended meanings:

| Attribute | Intended behavior |
| --- | --- |
| Creativity | Find ideas outside the meta; enable or multiply unconventional/off-meta hero strategies. The user suggested generating an off-meta opportunity for the manager. |
| Stability | Consistently perform near the player's level rather than swing wildly. |
| Confidence | Change how tournament tier/pressure affects stability and other performance. |
| Stamina | Sustain a dense game schedule; higher-tier matches and bootcamps should be more demanding. |
| Hero pool | Breadth of heroes a player can play; eventually distinguish amount of comfort from detailed hero proficiency. |
| Laning | Win lanes even with poor hero matchups. |
| Teamfights | Execute spells and coordinate full-team fights. |
| Farming | Collect gold efficiently and create item advantages. |
| Skirmish | Excel in fights involving fewer than both full teams. |
| Vision | Place good wards and deward the enemy. |
| Intuition | Read enemy movements, anticipate danger and survive. |
| Pushing | Keep waves in useful positions and deal tower damage. |
| Happiness | Overall morale and satisfaction; paying and treating players well should matter. |

Current profiles display 12 skills on 0–100 scales, plus happiness and energy. Some skills already affect the simplified engine; full distinct behaviors for all attributes are not implemented. Confidence changes after results but does not yet model tournament-tier pressure. The hero-pool number is not yet a per-hero proficiency database. Negotiated pay now affects weekly happiness, and contracted practice/rest changes development and recovery. Negotiation preferences are gameplay estimates derived from stamina/confidence.

Targeted weekly training now covers all 12 skills, each displayed playstyle, happiness and energy recovery. Original bundled targets and unedited workloads retain their effects. Intensity, hours/day and days/week scale gains and energy costs, within negotiated practice/rest limits. Skill growth follows workload/coach rules with a 99 cap; playstyles use fractional workload/intensity gains up to 10 without a coach multiplier. Happiness sessions have base +6 happiness scaled by workload/intensity, with balanced base recovery; debt and contract modifiers still apply. Training cards open full profiles. See [training rules](training.md). These are illustrative management rules, not sourced development rates. Teammate effects, bootcamp gains, decline/aging, potential and scouting uncertainty remain future work.

## 4. Playstyles are separate from player skills

The user wants a list of playstyles, rated **1–10** for all players, including historical players such as AdmiralBulldog, Arteezy and BuLba. AI-assisted bulk assessment was proposed for eventually populating ratings, subject to validation.

Examples discussed include farming carry, tempo carry, hard carry, roaming support, disabling support and save support. The current scaffold also shows aggression, initiation, split pushing, teamfight and vision control tendencies.

Weekly practice can now improve any playstyle shown on a player's profile, capped at 10. Teammate and bootcamp effects remain future work. Team fit and preferred strategies should matter separately from mechanical ability. The current ratings are gameplay placeholders and do not modify match outcomes. The final taxonomy, scoring definitions and deeper development interactions are still open.

## 5. Patches, hero tags and the evolving meta

The user does not want exhaustive patch notes. The idea is **one or two representative major patches per year/era**, attached to specific tournaments, with concise attributes and meta hero lists.

The current seven patch dimensions provide a starting schema:

1. Game tempo — patient scaling versus early pressure.
2. Farming economy — how rewarding resource accumulation is.
3. Lane importance — how strongly lanes shape the game.
4. Teamfight impact — value of full-team engagements versus pickoffs.
5. Objective pressure — converting map control into towers/objectives.
6. Vision advantage — the impact of map information.
7. Split-push viability — applying pressure away from the main team.

Heroes need tags for role and strategic properties, such as initiation, durability, control, saving, pushing, scaling and damage type. A patch changes hero strength and viable playstyles, not just a cosmetic version label. Player comfort and creativity should leave room for successful off-meta picks.

Current patch values, meta ratings, roles and ability archetypes are illustrative. Patch attributes do not affect the lane engine. TI1 membership and annual release pools through 2026 are sourced and gate actual engine drafts. Dated patch records, per-tournament patch selection and meaningful patch balance remain future work.

## 6. Drafting

Requested future direction: the manager drafts against a heuristic AI. The AI should combine general draft principles, patch/meta strength and team coherence.

Potential inputs from the discussion:

- Hero tags and complementary roles/abilities.
- Cohesive overall strategy and ability to execute it.
- Meta strength for the event's patch.
- Player hero proficiency and preferred playstyles.
- Creativity and off-meta opportunities.
- Opponent draft and what their composition threatens.

Draft quality should influence real match situations. A pushing composition needs a way to exploit objectives; a pickoff composition needs opportunities to isolate heroes. The current engine auto-selects a unique, position-preferred ten-hero draft from the campaign's unlocked hero pool. **Interactive drafting, bans and draft-scoring AI are not implemented.** Exact formats and how to expose explanations are still open.

## 7. Matches: current lane engine and future manager orders

### Implemented and explicitly approved

The old lane engine now determines best-of-three results. A map viewer shows the computed series, and the manager can pause, speed up or skip playback without changing the outcome. Per-game hero K/D/A, levels, resource graphs and results history exist. Keep these useful even if the simulation becomes more sophisticated.

### Original long-term tactical idea

- Map state includes positions, vision and towers.
- Matches unfold in phases/rounds. The manager issues a small number of plays per round, roughly two in the initial idea.
- Example plays: a top-jungle gank sweep, farming bottom, coordinated pushes, or moving players to create/defend an objective.
- Execution depends on player stats, enemy stats and the plays each side is attempting.
- Fight outcomes depend on participating heroes, gold/item advantage, teamfight skill, draft, positioning and other understandable factors.
- Rounds continue until an Ancient falls.

This is a future design direction, not permission to replace the newly approved auto-battle/skip flow with a large tactical UI immediately. Round duration, play catalog, player allocation, simultaneous-order resolution, information/vision model and how much direct manager control feels good are unresolved.

Good outcome explanations were suggested: show why a play succeeded or failed rather than burying the manager in hidden rolls. Detailed fight logs, actual inventory/items and exact Dota hero spells are not yet built.

## 8. Management and finances

The original summary identified management as the first playable foundation: team/free-agent rosters, training, staff, finance, wages, earnings, sponsors, schedules and standings.

Implemented: recruiting free agents or players from historical clubs to replace starters by position, regional replacement of departing opposition players, negotiated weekly wages/bonuses/duration/prize share/practice/rest with deterministic counteroffers, early replacement compensation, renewal and pay satisfaction, individual training/rest, three staff roles, sponsor offers/bonuses/reputation gates, a ledger, and basic happiness/readiness. See [contracts](contracts.md). Existing saves retain their original rolling terms until a deal is signed.

The local sponsor market now adds negotiated weekly support, bonuses, fixed terms and media obligations, global exclusive holders, five slots per club and expiry. Sponsor benefits alter weekly development/recovery/morale/reputation, with caps and training previews. Brand entry years and source associations are researched; contract finances, durations, assignments and benefits are illustrative. AI clubs participate in ownership, without a separate AI financial/training economy. Historical contract ends, exhaustive sponsorship archives and performance clauses remain future work. See [sponsors](sponsors.md).

Future work from the vision includes richer contract clauses and morale, staffing effects, team development, realistic scouting/roster movement, and preparation costs. Detailed standings, full tournament brackets, contract-driven automatic departures, agent personalities and staff upgrade/career systems are not implemented. Avoid importing the old prototype's flat per-match payouts or direct damage/HP staff bonuses without reconciling them with the new weekly economy and chosen design.

## 9. Suggested next discussions, not an approved sequence

Useful questions for the next feature conversation:

- Should we first improve simulation balance/explanations, campaign scheduling, manual drafting, or the historical data layer?
- Which systems must use verified history next, and which should stay fictional placeholders?
- What level of simulation detail is enough for management decisions to feel meaningful?
- How much historical roster fidelity should remain after the managed timeline diverges?

Engineering possibilities such as save export/import, multiple slots, persisted replays, more modular UI and eventually backend/accounts are **optional proposals**, not user-approved requirements. The selected annual player/team and hero-release layer through 2026 is implemented locally and has not yet been deployed. Signature heroes, deeper regional coverage and individual role/biography verification remain future data work.

## October 22, 2026: dated calendar and club inbox

The user requested a real calendar showing every tournament's full duration, clickable event entry/qualification and a useful inbox. The local month grid now consumes the tournament-history catalog directly, with inclusive event spans, overlapping bars and linked qualifier routes. Invitations and qualified/open-qualifier spots can be reserved without moving time; starting a run still applies the tournament engine's entry and scheduling checks. Pending historical verification stays visible and locked. Existing weekly saves can explicitly adopt the dated competition clock while retaining their club state and archive.

A persistent manager inbox now carries tournament invitations, registration/opening/missed-window notices, placement results, player renewal/expiry notices, sponsor opportunities/expiry and low-cash alerts. It supports unread badges, search, filters, read/archive state and links to relevant management actions. Invitation notifications use a simulated 28-day lead time rather than claiming verified historical announcement dates. UI time advancement stops at invited/reserved openings and scheduled series so the manager can make the decision. These features remain local. Details, save compatibility and limits are in [calendar and inbox rules](calendar-inbox.md).

The inbox now retires notifications when requirements change, an action is completed, or information becomes outdated. Expired notices no longer count as unread or expose obsolete actions; an Expired filter keeps their history and reason. Active reminders refresh their countdowns, and unresolved player renewals remain visible. This is implemented locally with optional metadata for existing saves; see the notification-expiry rules in [calendar and inbox](calendar-inbox.md).

## Player performance — October 22, 2026

Local player profiles now have a **Performance** section with campaign event ratings, GPM/XPM, KDA, kill participation, damage/healing/building damage, last hits, lane win rate and hero records, filtered by season/event/hero. These reflect actual saved campaign maps; no historical statistics are invented. New engine telemetry measures effective damage/healing and assigned-lane resource advantage at 10:00 without changing outcomes. AI tournament matches now preserve compact player scoreboards for scouting/career records, without timelines or replays. Old matches retain missing metrics as unknown. Wards/dewards explicitly remain unmodeled pending a real vision system. Rating formulas, samples and save compatibility are documented in [player performance](performance.md). This change is local and not deployed.
