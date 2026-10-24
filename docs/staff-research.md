# Staff and patch research

Implemented locally, October 23, 2026. Not published.

Staff also support opponent scouting and draft preparation through **Scout your next series**, **Teams** profiles and the pre-map draft screen. Tactical roles add specialist insights from completed public campaign maps and a legal plan the manager can apply. The therapist keeps recovery duties. See [team scouting and preparation](team-scouting.md) for coverage, evidence and limits.

Each patch has fixed, shared underlying axis values and favored-hero power. Teams receive incomplete information about those values. Research changes decisions, not the balance itself. Staff identities, specialties, salaries and AI staffing are fictional gameplay rules.

## Your report

Without research staff, every axis has a **35-point total spread** on its 0–100 scale, and two of the six favored heroes are identified. For example, 40–75 is a spread of 35, not ±35. The lower bound is sampled uniformly from all legal integer bounds that contain the true value, using a mixed team/patch/axis seed. The true value can fall anywhere, including exactly at either endpoint for integer ratings; it is not centered. Near 0 or 100, sampling uses only legal full-width ranges rather than clipping a wider draw. A different team can see a different range for the same true patch; reloads retain the same report.

| Staff | Weekly wage | Axis coverage | Additional heroes | Other effect |
| --- | ---: | --- | ---: | --- |
| Morgan Hale, head coach (`c1`) | $650 | Tempo and laning: 5-point spread | 0 | Existing training growth up to +1 at 20 hours/week, with existing fatigue/workload scaling |
| Ari Quinn, analyst (`c2`) | $450 | Teamfights and vision: 4-point spread | 1 | Replaces the previous flat +0.035 combat bonus |
| Sam Ellis, physical therapist (`c3`) | $400 | None | 0 | Existing +8 weekly energy recovery |
| Reese Park, economy coach (`c4`) | $500 | Economy and objectives: 4-point spread | 0 | Research only |
| Jamie Vale, strategy scout (`c5`) | $425 | Split push and vision: 5-point spread | 1 | Research only |
| Alex Rowan, hero specialist (`c6`) | $550 | None | 2 | Research only |

Overlapping specialties use the smallest width; they do not add or multiply. Narrower intervals are nested inside the wider interval, including the overlap between 5-point and 4-point vision research. Reloading, reordered/duplicate staff IDs and hiring/releasing/re-hiring cannot reroll estimates. Unknown staff IDs have no effect. Boundary values retain full-width bounded ranges. Even a full staff never displays exact axis ratings.

Hero research reveals an additional portion of one stable team/patch shortlist. It does not always reveal the strongest hero first. Discovered heroes now show a four-point **estimated equal-team win-rate range**, replacing the earlier power estimate. The internal target is capped at 58%; an uncertain team's interval can extend above it. Unknown favorites can still be drafted through ordinary eligibility and positive off-meta weights. They receive their actual calibrated combat power even if neither team knows it. Hero unlocks and unique/position-preferred drafts remain unchanged. See [historical strength and calibration](hero-balance.md).

The patch header no longer names unscouted favorites, and the hero catalog marks only the favorites in the current team report. Browsing is limited to the current and earlier composite patches; future phase reports cannot be opened in advance. Earlier patches use the current staff's assessment, not a newly introduced historical report archive. Real source versions and research limitations remain visible.

## Decisions and simulation

Auto-drafting constructs a perceived patch from each axis interval's midpoint and the discovered heroes' estimated strength. Unknown hero strengths contribute no special priority. Creativity and strategic tags still affect the weights. The original patch is separately retained for all combat, income, spell and building effects. Staff research never directly adds attack, HP or win probability.

AI clubs receive a stable pair of fictional research staff selected by their team ID from four profiles: head coach/scout, analyst/economy coach, economy coach/hero specialist, or head coach/analyst. They use the same report and perceived-draft rules. This is an AI research baseline, not a full AI staffing marketplace or payroll simulation. The manager's staff and finances are never applied to other clubs.

Both managed and AI tournament worker inputs carry the same per-team observer information. Every report resolves against the event's pinned patch, even after a newer patch arrives. Staff changes affect future preparations; an already-running worker keeps its submitted snapshot. Saved map results remain untouched. Old configs without observer metadata derive a stable AI-style observer for each team; configs without a patch keep neutral pre-patch behavior.

## Employment, payroll and compatibility

The Staff page shows current coverage, discovered hero count, each candidate's specific improvements, overlaps, wages and reserve requirement. Six distinct roles can be employed together. Hiring needs four weeks of that member's wages in cash, with no signing fee and no time advancement. Weekly payroll charges every employed role exactly once through the existing wage function.

Release is immediate and stops future wages without a fee. Research represents access to employed staff's ongoing reports: releasing someone removes their coverage and shortlist contribution, falling back to remaining specialists or baseline observation. The UI states this rule. No permanent hero-discovery progression or research time/assignment system is introduced in this pass.

Existing `staffIds` remain valid. The original three staff IDs retain their salaries, and the coach/therapist retain training/recovery behavior. The analyst's old flat combat bonus is removed for future maps. Research is derived from stable team identity, patch ID and staff IDs; no save schema/storage-key change or retroactive finance, attribute, clock or result modification is needed.

## Validation

**35-point range update:** all eight patch-research tests pass, including full-width boundary ranges, all 36 integer placements, stable reports, nested specialist reads and both tournament workers. The production build attempt is blocked by separate `src/talents.ts` errors referencing `Campaign.talentPlans`, which is not currently declared.

**25-point range update:** all **167 application tests** and the production build pass (existing chunk-size warning). The added check samples 2,048 team reports at one fixed truth, covers all 26 integer placements including both endpoints, checks against center bias, and exercises fractional/boundary values with nested specialist reads. Baseline width expectations and release fallback checks now require 25 points.

**160 application tests and the production build pass** (existing chunk-size warning). Seven added tests exercise every historical profile and generated future patches, bounded/nested/targeted ranges, overlap and reload determinism, progressive hero discovery, immutable hire/release/payroll/save behavior, actual research-dependent drafts, unknown hero combat truth, and parity across both tournament workers.

Earlier isolated browser QA on **5305** verified the former 12-point baseline ranges/two heroes, analyst-only 4-point teamfight/vision ranges, hero-specialist and scout discovery up to six, overlap/fallback on release, unchanged cash/date during staffing, reload persistence and narrow light/dark layouts. A real TI1 AI batch completed 19 series, followed by a managed-worker skipped series with its patch-labeled scoreboard. Existing normal-origin and hosted campaigns were not touched.

Runtime: `src/staff.ts`, `src/patch-knowledge.ts`, `src/battle.ts`, `src/game.ts`, `src/historical-game.ts`, `src/tournament.worker.ts`. UI: `src/StaffOffice.tsx`, `src/PatchMeta.tsx`, `src/HeroPool.tsx`, `src/patches.css`. Tests: `tests/patch-knowledge.test.ts`.
