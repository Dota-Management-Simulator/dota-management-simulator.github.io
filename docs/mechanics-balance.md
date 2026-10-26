# Combat mechanics and patch balance — October 25, 2026

Local implementation and ongoing CPU calibration. Not published. No campaign
save, clock, money, roster or archived result is changed by the experiment.

## Patch rules affect real matches

New patched battles use the named spell/item catalogue, hero identities,
consumable recovery, paid interruptible teleports, regeneration, backdoor,
Glyph, siege waves, denies, buybacks and approximate high-ground sight/misses.
These run in the production `LaneBattle` used by watched and skipped matches.
See [combat identity](combat-identity.md) and [siege rules](match-rules.md) for
supported mechanics and explicit abstractions.

`patch-mechanics.ts` derives the public **Combat and siege rules applied**
section from the same `matchRules` and source TP catalogue read by combat.
It compares with the previous composite, lists actual changes, and retains
an expandable list of all current rules. It does not expose private hero
coefficients, grant staff knowledge or infer a winning strategy from notes.
Existing hero/item notes still contain a wider historical record than the
engine implements. Unsupported complex interactions remain source notes.

Two composites per season condense historical updates; these are not exact
letter-patch builds. Generated future seasons inherit the latest recovered
structural rules and kits, alongside their existing generated strategic axes.

## Resource corrections before fitting

Older Void Stone/Sage's Mask and other percentage mana-regeneration items
were being interpreted as flat mana per second. A 50% item could therefore
add 50 mana/s. They now multiply base/attribute mana recovery in early eras.
Urn's 7.06 flat bonus remains flat. Nearby living allied item auras supply
flat recovery; the strongest overlapping item recovery aura is used, so
duplicate auras do not stack. This remains a bounded aura abstraction.

Strength supplies 0.03 HP/s before 7.06, then 0.06. The 7.07 composite uses
attribute amplification of base/item recovery: 0.7% per Strength and 2% per
Intelligence. From the 7.20 composite, additive attributes supply 0.1 HP/s
and 0.05 mana/s. Hero source base regeneration and owned-item source stats
are retained; pre-7.07 percentage mana uses 0.04 per Intelligence. Early
2011–2013 source bases remain provisional. Health recovery uses the existing
0.4 scale. Fountains and supported spell recovery retain their authored
scaled behavior rather than claiming a full historical formula reenactment.

From the 7.26b composite, a living nearby allied Tier 1/2 supplies 1/3 HP/s
before health scaling; overlapping towers do not stack. The radius is adapted
to engine coordinates. Dead/enemy towers provide no recovery.

Primary references: [Valve 7.06](https://www.dota2.com/706),
[7.07 regeneration formulas](https://www.dota2.com/duelingfates),
[7.20 resource rework](https://www.dota2.com/720), and
[7.26b tower recovery](https://www.dota2.com/datafeed/patchnotes?version=7.26b&language=english).
The existing pinned game-file catalogue provides item amounts, prices,
channels and cooldowns. Historical source notes are not internal tuning edits.

## Fresh calibration running

Process **69740**, output **`.local/mechanics-hero-balance/`**, was started
against the reviewed mechanics on October 25. It uses six CPU workers and
starts from the modest current priors, rather than coefficients fitted to
old generic spells. No network or model calls occur inside the runner.
Existing jobs/servers and the old blocked continuation are preserved.

For all 32 phases, the initial pass measures 4,096 current-engine baseline
maps, four rounds of 1,024 fitting maps, and 4,096 tuning-validation maps.
Unresolved phases can receive up to three passes. If every phase passes,
a further 4,096 independent final-validation maps per phase are required.
That is **393,216 maps for the initial pass**, and **524,288 including the
final holdout** if no further fitting passes are needed. Extra passes add
work. This is a long background CPU experiment, not a completed balance claim.

Each real map uses equal all-50 player attributes, full condition, no team
power bonus, ten unique position-legal era heroes, automatic purchases and
tactics/Glyph/buybacks, the actual map geometry and all current mechanics.
Drafts are paired with sides swapped; training, baseline, tuning validation
and final validation have separate seed domains. The focal hero rotates to
improve coverage. Original historical observations and 42–58% design targets
remain unchanged. Fitting goals are centered by role pool, with an internal
44–56% margin. Hero power remains separate from player-skill safety bounds.

Activation requires all requested phases to pass:

- At least 128 validation appearances per hero, with finite coefficients.
- No hero confidence interval entirely above 58% or below 42%.
- Mean absolute target error at most six percentage points, and lower than
  that phase's fresh current-engine baseline.
- No unfinished simulation in the phase's fitting/validation experiments.
  Failures retain their exact configuration and seed in `failed-maps.jsonl`;
  they are never assigned a fabricated winner.
- A side-win confidence interval that is not entirely outside 45–55%.
- Median duration 15–90 minutes, 90th percentile at most 120 minutes, and
  at most 10% of games shorter than ten minutes.
- The independent final holdout passes the same gates after tuning selection.
- Source fingerprints still match, followed by passing application tests,
  TypeScript and an isolated production build. A failed verification restores
  the prior runtime file; changed source withholds activation.

These are authored benchmark acceptance policies, not claims about real Dota
match distributions. Wilson intervals conservatively halve appearances for
side-swapped pairs. Role breakdowns are retained, but a single hero coefficient
does not certify every role, draft combination, manual strategy or player skill
level. The upper/lower bounds are statistical diagnostics, not guaranteed
campaign win rates. Mechanical identity and source stat changes remain active;
fitting adjusts bounded hero combat power rather than deleting a spell or
weakening backdoor protection to force results.

## Progress and reproduction

`status.json` contains the process ID, phase progress, actual completed map
count, failed maps and in-flight batch counters. `state.json` checkpoints
completed phase experiments. `candidate.json`, comparison CSV and role-ranking
HTML/JSON/CSV are produced at completion even if activation is rejected.
`complete` with `runtimeApplied: true` is the successful activation state;
`complete-with-balance-flags`, `complete-stale-inputs` and verification failure
states explicitly do not establish completed balance.

The running command is:

```sh
node scripts/iterate-hero-balance.mjs --out .local/mechanics-hero-balance --baseline .local/hero-balance-rounds/candidate.json --fresh --workers 6 --rounds 4 --maps 1024 --validation 4096 --passes 3 --apply
```

Do not start a second process against that folder. If the process has stopped,
the identical command with `--resume` reuses completed phases and rejects
changed inputs. The old candidate supplies only the existing file schema and
provenance for this `--fresh` run; its measurements/coefficients are not reused.

For a small completion audit, use a different output directory and `--audit
--fresh --maps 16 --validation 16 --passes 1`. Audit mode never activates,
even with `--apply`, and cannot establish hero balance from sparse samples.

## Verification so far

Two frozen **512-map / 32-phase** pilot sweeps completed with **zero stalled
matches**. The second includes flat Urn and item-aura corrections. Their
fingerprint status is stale because the runner/acceptance code was refined
after bundling; their map evidence remains a mechanics smoke check only.
No pilot coefficients were applied. The ongoing larger run has its own fresh
fingerprint and independent seeds.

All **390 shared tests** pass, plus a separate real CLI integration test verifies
two side-swapped maps, exact hero appearance/win totals, source fingerprint
completion and refusal to activate audit results even with `--apply`.
TypeScript, isolated production build and CRLF-aware diff checks pass (existing
bundle-size warning). The new five focused mechanics/policy tests cover old
percentage recovery, the 7.06 exception, auras, public rule deltas/future inheritance,
sampling/upper/lower/side/completion/duration acceptance gates.

Balance is still **pending** until the larger run's final status confirms it.
