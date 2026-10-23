# Historical hero strength and engine calibration

Local implementation, October 23, 2026. Not published.

## Iterative follow-up and role rankings

The user requested several further rounds across every patch and internal top-ten lists per role. `npm run balance:heroes -- --workers 12 --apply` warm-starts from the preserved first-run checkpoint in `.local/hero-balance-rounds/baseline.json`. It runs four additional fitting rounds per pass and 4,096 separate validation maps per phase. Phases with remaining significant ceiling violations or without a lower measured target error can receive up to three passes (twelve further fitting rounds). Check `.local/hero-balance-rounds/status.json` and `run.log` for actual completion; this paragraph is not a claim that the results passed.

The player-power safety bounds now apply before the hero correction. This preserves development for both heavily nerfed and heavily buffed archetypes; otherwise the final floor/ceiling could give different skill levels identical combat power. The iterative batch was restarted after this fix, retaining the earlier 49,152 completed fitting maps in `first-attempt-run.log` as a superseded partial run. A 96-map warm-start comparison before/after the fix was identical. Seven focused balance checks pass, including low-skill and elite progression under −55%/+82% hero corrections. A separate 192-map worker smoke verified exact hero/role appearance and win totals. `scripts/watch-hero-rounds.mjs PROCESS_ID` supplies completed-round counts in `progress.json` and refreshes the active ranking report after the pipeline finishes.

The restarted worker also bundles the current talents/New Frontiers engine and modern-era calibration signatures; it does not reuse older maps as validation of those mechanics. The original checkpoint supplies starting coefficients only. Error comparisons against the original experiment span that engine change for modern phases and are diagnostic rather than a controlled estimate of improvement from fitting alone. Post-correction checks pass **176 application tests** and the production build (existing chunk-size warning). The large batch's final validation/activation remains pending in its live status file.

Smaller fitting steps limit noisy overshoot. Fitting goals center the role-pool average near 50% (both sides cannot simultaneously average >50%) and leave a two-point margin below the ceiling. Original phase targets, historical observations and raw measured outcomes remain unchanged. Each pass uses different seed domains; selection across passes makes its validation samples tuning evidence, not a final untouched population guarantee. Accepted means lower measured target error than the original experiment and no conservative significant >58% flags. Different sample sizes mean error comparisons are diagnostic. Coefficients activate only if every requested phase passes those checks and application tests/TypeScript/build pass; otherwise the completed candidate stays local. There are no model/API/network calls in the simulation loop.

`src/hero-rankings.ts` supplies `rankHeroesForRole` and `strongestHeroesForRole`. Every historical phase has ten unique eligible heroes highlighted in each of Carry, Mid, Offlane, Soft support and Hard support. Uncalibrated/future phases use internal design targets. Measured phases rank the **role-specific** sample after a 64-game prior toward its phase target, retaining raw counts and confidence intervals alongside the score. Compensation power is never used as a ranking score. Stale profile signatures are rejected. These lists are an internal truth/reporting API and do not feed omniscient data to scouting or auto-drafting.

`npm run rank:heroes` exports JSON, CSV and a local HTML report with gold top-ten highlights to `.local/hero-balance-rounds/`. Candidate export uses `--candidate PATH` and labels its output separately from active runtime strength. The iterative run exports its completed candidate automatically. The HTML report supports patch/role selection; it is not added to the game's navigation. Existing campaign saves, time and completed results remain untouched.

## Completed first-run audit

The first batch **finished all 163,840 actual maps across 32 phases**. Across 3,470 hero/patch records, held-out mean absolute target error was **6.07 percentage points**. 525 measured rates exceeded 58%; **43 records across 25 phases** had conservative paired-sample 95% intervals entirely above 58%. The highest measured rate was 81.746%. These results do **not** establish balanced patches.

The automatic verifier initially restored the previous empty calibration after a player-development test failed. That test changed creativity and therefore sometimes compared different drafted heroes. It now fixes the draft; all eight battle checks pass with the candidate coefficients in an isolated bundle. The candidate remains withheld because of the balance violations. Both the calibration CLI and verifier now reject activation when significant ceiling violations remain. The CSV and checkpoint preserve the experiment; no long-running job remains to finish this batch.

Hero differences currently comprise roles, primary attribute, ranged/melee attacks, four generic ability archetypes, strategic tags and phase-specific strength coefficients/targets. Exact individual Dota spells, items, stat-growth changes and player-specific hero proficiency are not simulated. Players have identity-specific developing attributes and condition; a patch changes their effectiveness rather than rewriting their saved skill ratings. Playstyle ratings remain outside combat. Thirty phases still lack observed historical hero counts. These are material limits on claims of numerical realism.

## What 58% means

Every eligible hero has an internal strength target for each composite patch. Targets are bounded to **42–58%** in an equal-player benchmark. 58% is a deliberately strong balance target, not a claim that real Dota statistics never exceed 58%, and not a cap on a strong managed team's campaign results. A 58% target is also not +58% damage or a per-match coin flip.

The engine still resolves lane movement, combat and Ancient destruction. Offline calibration adjusts each hero's combat power within the existing engine so the benchmark trends toward the target. Those correction coefficients also compensate for differences between the engine's simplified hero archetypes. They are separate from draft priority, historical observed win rates and the target win rate.

## Historical evidence and gaps

The existing 32 composite patch identities and Valve note cache remain. Each phase now contains a strength record for **every hero in its eligible annual pool**, not just its six featured heroes. Sourced observations are scoped to a particular phase; they are never copied to the next phase or to generated future seasons.

Two community statistical snapshots were recovered from [Chris Arena's dota2stats repository](https://github.com/chrisarena/dota2stats):

- [TI2015 pick/win/loss counts](https://raw.githubusercontent.com/chrisarena/dota2stats/master/ti5.txt), used for `2015.2`.
- [Shanghai Major 2016 counts](https://raw.githubusercontent.com/chrisarena/dota2stats/master/shanghai.txt), used for `2016.1`.

The snapshot author describes these as copied DatDota/Dotabuff tables. Their event completeness, exact snapshot cutoff and ban counts have not been independently verified. They are useful historical observations, not a complete patch-wide professional sample. Raw responses, source URLs, event windows and attribution are retained in `scripts/data/hero-history-sources.json`. The compiler checks hero-name aliases and validates wins + losses = appearances. No table data is silently inferred from narrative patch notes.

The TI2015 snapshot records Bounty Hunter at **33 wins from 48 appearances (68.75%)**. That observation is preserved exactly. Its game target is shrunk toward 50% with a 40-game neutral prior, then capped at 58%. Techies' 7–1 snapshot remains 87.5% as an observation but receives a much smaller game target after sample shrinkage. Sparse event results cannot turn a hero into an automatic win.

For phases without observed counts, the previously authored featured-hero priorities provide provisional era priors. Other heroes receive small strategic-fit estimates from the phase's economy, teamfight, movement, objective and split-push axes. These remain estimates. The cached Valve notes supply source/version context; they do not establish verified pick/win rankings. The two observed phases derive their featured shortlist from sample-supported priority rather than retaining the same authored list regardless of results.

The statistics sites and OpenDota endpoint checked during this pass denied access; requests stopped. The older blocked archive was not repeatedly queried or bypassed. **Thirty phases still lack an attached pick/win snapshot.** Generated future targets are explicitly fictional and deterministic. The existing annual hero-unlock rule remains; a featured hero not yet unlocked retains its locked preview and cannot enter a draft early.

## Knowledge versus truth

Staff discovery still starts at two of six favored heroes and expands through research specialties. The UI now shows an uncertain **estimated neutral-team win rate**, not a raw power bonus. Fractional internal targets remain inside the displayed integer ranges. Scouting can overestimate or underestimate the rate; the interval may extend beyond 58% because teams do not know the exact target ceiling value of a particular hero.

Auto-drafting uses only discovered hero targets and estimated axes. Unknown heroes' internal targets, calibration coefficients and historical count records do not enter that team's decision model. Every drafted hero, discovered or not, receives its true calibrated power in combat. Raw calibration tables are development data, not an additional in-game scouting reveal.

## Local simulation program

Run from the repository root:

```sh
npm run calibrate:heroes -- --workers 8
npm run calibrate:heroes -- --workers 8 --resume --apply
```

The first command runs entirely on local CPU and writes checkpoints under `.local/hero-calibration/`. The second resumes an identical experiment and applies completed records to `src/data/hero-calibration.json`. It rejects a checkpoint when engine/profile inputs or experiment settings have changed. `--apply` is explicit; the ordinary application build, tests and game never start a large calibration job.

Controls:

```sh
node scripts/calibrate-heroes.mjs --help
node scripts/calibrate-heroes.mjs --patches 2011.2,2015.2 --rounds 3 --maps 1024 --validation 2048 --workers 4
node scripts/calibrate-heroes.mjs --patches all --rounds 6 --maps 8192 --validation 16384 --workers 8
```

The final example requests **2,097,152 actual maps** across all 32 patches. It can take substantial CPU time. More simulations improve precision; they do not recover missing historical evidence. There are **no model/API/network calls inside the simulation loop**, and no campaign saves are opened or advanced. The implementation work and chat still use ordinary assistant usage.

The default experiment requests 3 × 1,024 fitting maps and 2,048 separate validation maps per patch: **163,840 maps total**. Workers run patches independently, checkpoint completed phases and report actual measured map counts. The program does not describe repeated algebra or draft-only evaluations as full matches.

Every map uses the production `LaneBattle` engine, all-50 player skills, full condition, no difficulty/history/form/staff power advantage and ten unique position-legal unlocked heroes. A rotating focal hero improves coverage; teammates and opponents are sampled uniformly from legal roles. Each draft plays a paired game with team sides swapped. Fitting adjusts log power toward the target with bounded steps; mean log power is centered to avoid global inflation. Validation uses disjoint seeds and never feeds back into that fit.

Records retain actual appearances, wins, measured validation rates, 95% Wilson intervals, fitting rounds, targets, power coefficients and a profile signature. Intervals conservatively use half the appearance count because side-swapped pairs are correlated. Individual hero rates can be above 58% in a finite validation sample. The report flags heroes whose entire interval lies above 58%; such flags represent remaining imbalance, not a claimed success. Intervals are diagnostic rather than proof of a population ceiling. More samples and additional fitting may be needed. Current skill/hero proficiency, manual drafting, bans and complete Dota abilities remain separate limitations.

For a long unattended run, a local verifier can wait for its process and finish the checks without an assistant staying active:

```sh
node scripts/verify-hero-calibration.mjs --wait-pid CALIBRATION_PROCESS_ID
```

It writes `.local/hero-calibration/status.json` and generates `results.csv`. Significant balance outliers restore the previous runtime calibration and produce `balance-rejected-calibration-restored`. Otherwise it runs the application tests, TypeScript and production build; failed checks also restore the previous calibration. `verification.log` retains actual command output. The verifier uses local child programs only and sends no notifications or external messages.

## Compatibility and validation

Calibration affects future computations; saved outcomes, money, player development, event dates and registered patch identities are not rewritten. Calibration is used only when its profile signature still matches the current patch. Missing or stale calibration falls back to a modest prior coefficient. Unpatched older configs retain the neutral engine path. `captureTimeline: false` removes observation work only and is tested to preserve actual results; replay capture stays off for offline batches. Fixed-draft inputs reject duplicates, locked heroes and incompatible positions.

Focused checks cover era pools/target bounds, phase-specific observations and aliases, sparse-sample shrinkage, fixed-draft legality and real Ancient destruction, headless parity, uncertain reports and stale-profile rejection. Existing tests continue to cover both workers, research-limited decisions, patch pinning and save preservation. The completed run's measured results and final verification are recorded below when available.

The pre-calibration suite passed 165 tests, followed by a focused paired-interval check. Production build passes with the existing chunk-size warning. Isolated **5306** browser QA verified 2015/2016 reports, both source disclosures, estimated win-rate labels, future-phase locks and desktop light/dark layout. Saved campaigns on other origins were preserved. The completed batch's balance rejection and test correction are recorded at the top of this document; the status file retains the measured audit. No empirical ceiling or completed balance pass is claimed.
