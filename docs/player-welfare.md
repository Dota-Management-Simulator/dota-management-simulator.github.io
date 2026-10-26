# Player expectations, relationships and departures

Implemented locally on **October 25, 2026**. Not published. Expectations are visible in Squad dossiers and player profiles, including prospective recruits. The system applies to the managed club; AI clubs retain their existing annual shuffle and regional replacement rules.

## Managing players

Every player has stable, simulated preferences for competitive results (40–65% wins), weekly workload (28–40 hours including individual training, attended scrims and sponsor media), two or three days off, and a flexible, scrim-first or individual-training-first practice mix. Roughly one fifth have more demanding personalities: dissatisfaction accumulates faster and their minimum patience is shorter. These are game traits, not claims about the real people.

Competitive ambition uses the most recent twenty recorded competitive maps featuring that exact player, starting with their current tenure's week. At least six maps are required. Actual winning side matters; small samples, unknown participants, private scrims, Arcade, skipped events and historical reference finishes add no invented results. Dated placement summaries do not duplicate their underlying maps.

Weekly training hours come from the actual configured schedule, with full Rest contributing zero. Scrim hours count only completed, attended sessions inside the elapsed seven-day payroll interval. Booking, cancelling, watching another team's scrim, or retaining old sessions cannot satisfy demands. Scrim-first players want 2/4/6 hours alongside a training week; individual-training-first players object when scrims dominate at least a four-hour practice block. The original weekly calendar cannot schedule scrims, so scrim-first demands are suspended there.

Training has no assigned weekdays. Free-day accounting therefore uses the greater of scheduled training days and distinct attended scrim days, rather than inventing exact overlap. Media contributes hours, without invented weekdays. This is an explicitly approximate scheduling model, not a daily diary. The UI distinguishes the current weekly training/media plan from attended scrims over the last seven days.

Existing negotiated practice/rest limits continue to constrain training. Contract bargaining preferences and ongoing personal expectations are displayed separately: accepting compensated contract terms does not rewrite a player's personality, competitive ambition or preferred practice mix. General Happiness training, wages and therapist benefits still affect existing morale; they do not erase specific complaints about workload, results or teammates.

## Warnings and recovery

New signings and older saves receive two weeks to settle in. Satisfaction begins at 75/100. Each weekly management review assesses overload, insufficient rest, practice mix, ambition, happiness below 40%, exhaustion below 30% and teammate friction. Each issue carries bounded pressure; satisfaction falls by at most 22 per week and existing happiness by at most four additional points. No unmet expectations restores twelve satisfaction and reduces accumulated unhappy weeks by two.

After two unhappy reviews the inbox carries a concern. At 30 satisfaction or lower, with at least 2–5 accumulated unhappy weeks (depending on patience), the player gives notice. They must remain dissatisfied for **two more weekly reviews** before quitting. Resolving all issues, or restoring satisfaction to at least 55, withdraws notice at a weekly review. Old warnings retire from the active inbox when replaced, resolved or followed by departure. Messages deduplicate on reload.

If a player recovers and later becomes unhappy again, the new concern episode receives a fresh actionable warning.

**Meet & mediate** gives eight satisfaction and reduces both sides of existing teammate tension by 25, once per player per four weeks. Its recovery effect continues over two reviews. Meetings cannot withdraw notice by themselves; the underlying issues still matter. Compatible relationships ease naturally. Simulated clashing styles build fourteen tension per strained review, and recover seven during calmer weeks; tension at 45/70 adds moderate/strong concerns. Strain means overload, exhaustion or a sufficiently sampled win rate below the player's ambition. No named historical feud is assigned.

Weekly reviews run at the same payroll boundaries for a large calendar jump and several smaller advances. Registered tournaments defer departures until their run completes. Completion processes any due notice after registered prize shares are paid; pay continues under the existing tournament rules. Prepared scrims lock kicks and replacement signings until completed/cancelled. An attempted distant tournament start that projects a depleted roster is refused atomically with guidance to use Continue and address concerns first.

## Kicks, vacancies and recruitment

**Kick player** appears in the Squad dossier and full profile. An inline confirmation states the exact existing early-release cost: 25% of remaining fixed wages, zero on a rolling agreement. Insufficient funds and active tournament/prepared-scrim commitments block release. Confirming removes the starter, current contract and future wage obligation once. A voluntary resignation pays no release fee. This is a simulation rule, not a representation of real employment terms.

A rolling release remains available while the club is in debt, since it requires no payment.

Departures leave an actual vacancy. Training/payroll/calendar progression continues for remaining players. Competitive play, bot challenges and scrims require five distinct positions; existing saves support zero through five starters. Recruiting can fill an empty position or replace its occupied starter; roles are sorted back into position order. Historical ownership, regional replacement and registered-lineup checks continue to apply. An empty fictional/legacy roster is also rebuildable. A player who quit cannot be approached again for four weeks, preventing immediate re-signing from erasing their notice.

The optional `Campaign.welfare` stores current tenure reviews, tension, meeting cooldowns and up to eighty departures. Invalid optional metadata is discarded without invalidating an otherwise valid campaign. Loading never advances time or applies retrospective penalties. Player identities, archived results, combat RNG and old match lineups are retained. Save version and storage key remain unchanged.

## Historical research and limits

Research checked **October 25, 2026**, including both frequent movement and sustained lineup continuity:

- **EternaLEnVy:** [Cloud9's March 3, 2020 announcement](https://cloud9.gg/cloud9-welcomes-newest-members-of-dota-2-roster/) confirms his return from Fighting PandaS and prior Cloud9 spells in 2014–2015 and 2017. [His roster history](https://liquipedia.net/dota2/EternaLEnVy) supplies the broader movement context. Repeated organization changes support a mobility reference, not a claim about misconduct or why any move happened.
- **ana:** [contemporaneous reporting of OG's 2018 break announcement](https://win.gg/news/ti-champion-steps-back-from-competition/) and [OG's later extended-break announcement](https://www.oneesports.gg/dota2/og-ana-to-take-extended-break-will-return-next-season/) demonstrate that time away can matter even after winning. They informed the free-time mechanic; no invented numerical demand is attributed to ana.
- **Puppey:** [his historical roster record](https://liquipedia.net/dota2/Puppey) provides a long Team Secret tenure as a counterexample to assuming every player frequently changes teams. The implementation uses completed historical observations, not current-team claims or a fixed loyalty label.
- **Alliance / Liquid's 2019 core:** [Alliance's departure announcement as reproduced contemporaneously](https://www.gosugamers.net/dota2/news/50359-alliance-and-roster-part-ways) records five players leaving together. [Liquid's history](https://liquipedia.net/dota2/Team_Liquid) records the same five joining. Such whole-core moves should not be interpreted as individual instability.

The runtime uses the project's already sourced annual roster catalog, not scraped opinions or a hidden list of allegedly difficult players. It considers observations through the previous campaign year, capped by the imported data year: future career knowledge cannot affect a 2011 personality. Only consecutive years with one unambiguous organization observation count. Changes retaining at least three of the same players are excluded. Every three remaining observed changes shorten patience by one week, capped at two; other demands and sensitivity remain deterministic fictional traits.

Annual snapshots are incomplete and can miss midseason changes, stand-ins, renamings or exact transfer circumstances. They are explicitly labeled observations, not complete transfer counts. Sparse coverage is not evidence of loyalty. The system makes no historical claims about specific player rivalries, private demands, win-rate ultimatums or reasons for departures. Longer-term ambition contracts, exact daily scheduling, poaching and independent AI-player resignations remain outside this implementation.

## Validation

The focused welfare suite covers deterministic/historically bounded preferences, whole-core exclusions, participant-attributed win rates, actual attended workload, warnings/notice/resignation, recovery, bilateral mediation, split calendar advancement, tournament/prepared-scrim locks, release costs/ownership, vacant and empty save reloads, contracted recruitment, legacy normalization and inbox expiry. Long-running import/qualification fixtures now fund recovery blocks so they continue to test their own invariants instead of unintentionally neglecting the roster.

All **340 shared tests**, including **14 focused welfare tests**, TypeScript, the isolated production build and the CRLF-aware diff check pass; build retains its existing large-chunk warning. Disposable localhost **5351** browser checks cover meeting cooldowns, retained notice, kick confirmation/cancellation, changed payroll, vacancy-to-recruitment navigation, full-profile offers, an actual resignation/inbox action and 1440px/390px/320px responsive containment. Screenshot: `.local/player-welfare-preview.png`. Normal campaign saves, hosted pages, background balance jobs and the concurrent post-game/home-emblem work were preserved. No commit, push, deployment or messages were initiated.
