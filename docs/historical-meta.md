# Phase-scoped historical hero strength

October 23, 2026 — local changes; not published in this pass.

Internal strength now follows available historical professional observations in **15 of 32 phases**. The remaining 17 keep explicit authored/strategic estimates. Generated future seasons remain fictional. Event observations are proxies for composite environments, not a claim to reproduce every original client subpatch.

The Anti-Mage correction is data-driven. The **147 complete TI2026 drafts contain zero Anti-Mage picks and zero bans**. Their per-hero pick distribution exactly matches the independently cached [TI2026 positions table](https://stats.ru.spectral.gg/lrg2/?league=ti15&mod=heroes-positions), and all recoverable classified-role win counts reconcile. The [event overview](https://stats.ru.spectral.gg/lrg2/?league=ti15) identifies 147 maps on 7.41e. Anti-Mage's new TI-window internal target is **46.86%**, not an authored featured-hero boost. This is an inferred game target, not a historical win rate for an unpicked hero. The earlier 2026 sample has one pick/four bans in 139 maps; its target is **47.96%**. No Anti-Mage-specific strength override is used.

## Evidence and coverage

| Phases | Primary strength evidence | Limits |
|---|---|---|
| 2013.2–2019.2 | Respective TI event pick counts and classified-role results | Bans unavailable in the cached tables; each event is a phase proxy |
| 2021.2–2025.2 | Respective TI event pick counts and classified-role results | Same limits; no TI2020 evidence is invented |
| 2026.1 | 139 dated professional Captain's Mode drafts, 7.41b/c | A local cached sample within the opening composite, not a complete season census |
| 2026.2 | 147 complete TI2026 drafts, 7.41e | Complete event; later subpatches are not copied backwards |
| 2016.1 | Preserved Shanghai Major pick/win snapshot | Community snapshot completeness remains unverified |
| Other 17 | Existing authored/strategic priors | Explicit estimates; no adjacent-phase observations represented as current facts |

`scripts/data/pro-meta-matches.json.gz` freezes 1,324 reduced public OpenDota match records from the user-provided Dota Drafter cache, together with hero-ID aliases and dated letter-patch boundaries. It contains no player profiles, account identifiers, chat, credentials or private settings. Source URLs follow `https://api.opendota.com/api/matches/{match_id}`. The importer accepts professional/premium Captain's Mode only, validates a full unique ten-hero lineup and the era's complete ban count, and partitions by actual start time. One incomplete draft and 33 matches outside the historical composite windows are excluded. The remaining 1,290 records include diagnostic older fragments and a broader 2026 sample; overlapping populations are **not added together**.

The compact evidence cache is `scripts/data/hero-meta-sources.json.gz`. It retains match IDs, dates, source links, population, patches, raw counts and all candidate samples. `python scripts/import-hero-meta.py` rebuilds it entirely offline from committed inputs. `node scripts/build-patches.mjs` then builds the runtime profiles. Both rebuilds are byte-reproducible. No normal build, draft or simulation requests external statistics.

Only samples from the **same composite** can set its targets. A sample needs at least 80 maps. Complete TI drafts take precedence only after exact reconciliation against the independent TI pick table and all recoverable wins. Next comes a substantial complete pick/ban sample, then an event's pick/result table. Three older fragments of one, twenty and eight maps are retained as evidence but cannot displace a representative event or certify another phase. There is no cross-phase strength carry.

The thirteen TI role tables supply exact pick counts. Their displayed role win rates are rounded; integer wins are recovered only if exactly one integer fits that percentage. Unclassified roles and ambiguous counts stay out of the win sample. Thus `winSample` can be smaller than total picks. Missing bans remain **null/unknown**, never zero. Those phases cannot recover the full strength signal of a heavily banned hero; their inferred ranks are less complete than the 2026 draft samples.

The earlier TI2015 and Shanghai raw snapshots remain separately preserved. For example, the original TI2015 Bounty Hunter 33/48 and Techies 7/8 records are not rewritten to fit the game ceiling.

## From observations to game targets

Raw professional win rate is not a neutral-team causal strength measurement. Player/team selection, bans, opponents and sparse picks affect it. Targets therefore combine field demand with shrunk results:

- Demand uses picks + bans where known, otherwise explicitly picks only. Shared mid-ranks handle tied counts; twelve prior contests temper very small counts.
- Results use a 40-game neutral prior and a bounded contribution. A 3–0 specialist cannot automatically dominate a frequently contested hero; a ban-only hero can still receive a strong target.
- Event confidence shrinks by `maps / (maps + 40)`.
- Final targets stay within **42–58%**. Original counts and observed percentages remain separate and unchanged. Zero picks have no observed win rate, rather than a fabricated 0% rate.

These are transparent game estimates informed by history, not fitted professional win-probability predictions. Samples without bans remain incomplete. There is no manually imposed list of heroes which must always be strong.

`hero-rankings.ts` ranks historically informed targets canonically for observed phases and retains measured engine rates separately as an audit. Thus a simulation outlier cannot relabel Anti-Mage as a historically dominant TI2026 hero. It also does not conceal that outlier: raw measured rate/counts remain visible. Unobserved phases retain the existing measured-role/target-prior fallback. The local report includes historical picks/bans/map counts, source links, role evidence and a hero filter; CSV/JSON retain factual counts. Top-ten highlights are internal only.

Both workers still use the true target/correction in actual combat. Teams' draft models receive only their staff-limited perceived reports, not full meta tables, historical counts or rankings. Existing saves, money, dates, attributes and completed results are preserved.

## Calibration and validation

CPU batch **46256** and watcher **64024** remain alive as requested, but their frozen targets predate this change. Their completion cannot certify the new observed targets. Changed target signatures reject stale coefficients. A follow-up process, **45140**, waits for both to finish, archives their files and launches fresh all-phase fitting against the current data. Its authority is `.local/hero-meta-balance-queue.json`; the older `status.json` still describes the preserved batch until the successor starts.

The successor remeasures a current-engine baseline, fits and validates separately, and requires every requested phase to improve with zero conservative ceiling flags plus tests/build before activation. The runner now also rechecks its source fingerprint at the end and refuses activation if engine/roles/targets changed while it ran. `complete-stale-inputs` retains the candidate as starting coefficients only. No calibration pass or measured balance completion is claimed here. This continuation is local CPU code, with no model/API/network calls or deployment.

**202 application tests**, **four Python importer tests**, TypeScript and the production build pass (existing chunk warning). Tests cover source selection and phase isolation, event/count reconciliation, malformed/duplicate/out-of-window records, rounded win recovery, missing bans, sparse perfect records, ban-only demand, original observations, target bounds, future-fiction labeling, canonical meta ranking with visible engine drift, and no hidden-count leak into drafting. Offline rebuilds are byte-identical. Local browser QA checks the 2026 carry rankings, actual evidence counts and hero filtering.
