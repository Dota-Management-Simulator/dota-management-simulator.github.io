# Two patches per TI season

Implemented locally, October 23, 2026. Not published.

**Milestone follow-up:** readable single-page notes now include hero arrivals and simplified hero changes. The 7.00 composite introduces player talent choices; New Frontiers introduces a genuinely larger battlefield and finite neutral farm camps. Both have official embedded introductions. See [milestone rules, compressed dates, calibration compatibility and validation](patch-milestones.md).

There are **32 historical composites: two per TI season from 2011–2026**. Each has a numeric ID (`2015.1`, `2015.2`), identity, seven priorities, six featured heroes and real version lineage. Future seasons receive two deterministic patches explicitly labeled fictional.

## Timing and saves

- Opening: day after the previous TI, alongside the existing roster/hero shuffle and before subsequent tournaments. Later-year starts begin on their season's opening phase.
- Road to TI: a curated second-drop date, generally following a major pre-TI balance release. 2012 uses a May proxy split within the long 6.74 client era.
- TI1: the dated campaign starts at TI1 on `2011.2`; `2011.1` is available for browsing and weekly campaigns.
- 2020: no TI; phase two lasts to year end and the next opening begins January 1.
- Weekly clock: opening at week 1, second at week 9, next opening after the week 17 shuffle. Rolling into the next year does not drop another patch.
- Generated future seasons: second phase May 15, next opening September 1; these are fictional dates. The first generated opening (`2027.1`) follows the imported TI2026 ending immediately.

These are **compressed season proxies**, not claims that real client updates were available on their proxy dates. For example, the 2017 opening condenses post-TI 6.88 revisions and December's 7.00 into one environment after TI2016. Actual source release dates are retained separately.

A tournament pins the composite from **its opening date** in optional `TournamentRun.patchId`, shared by both workers. Mid-event phase changes affect later event openings, not remaining maps. Older active events derive the patch from their registered opening date for remaining games. Already saved maps are untouched. New managed series and compact AI scoreboards retain `{ id, name, versions }`; older archives without metadata do not receive invented patch labels. No storage-key change, finance/rating reset or save conversion is needed.

## Actual engine effects

**Historical hero balance follow-up:** all eligible heroes now have phase-specific internal strength targets, bounded to 42–58% with equal teams. Two community count snapshots inform TI2015 and the Shanghai Major 2016; other phases retain explicit provisional priors. A CPU-only batch program fits hero power against the actual lane engine and records separate validation samples; the in-game research report shows uncertain win-rate ranges. This supersedes the earlier blanket featured-hero power description below. See [historical observations, calibration methodology and limits](hero-balance.md).

**Team knowledge (October 23):** managers no longer see exact axes or the complete hero list. Reports start with 12-point ranges and two discovered favorites; specialist staff narrow their fields to 4–5 points or expand hero discovery. Auto-drafts use each team's estimated axes and known hero priorities, while the following actual combat effects always use the underlying patch truth. AI and managed workers share these rules. See [staff, ranges, employment and validation](staff-research.md).

Both teams use identical rules. Training, condition, difficulty, historical lineup strength and campaign form still apply. Axes are 0–100, with 50 neutral; curated profiles use a narrower range than these maximum effects.

| Priority | Simplified effect |
| --- | --- |
| Tempo | Hero movement up to ±12%; spell cooldown speed factor up to ±18%. |
| Economy | Passive/last-hit gold up to ±25%, XP ±18%, gold's attack scaling ±20%. |
| Laning | Before match minute 10, laning skill and patch priority change hero/creep attack damage by up to ±30%. |
| Teamfight | Nearby allies change spell damage/healing by up to ±30%, capped at two partners; execution also changes bounded stun duration. |
| Objectives | Hero building damage up to ±30%, with a small pushing-skill contribution. |
| Vision | Vision/intuition skills change target acquisition range. No ward/deward or fog-of-war model is claimed. |
| Split push | Isolated heroes gain up to ±18% building damage, or ±35% when tagged Pushing. Isolation means no allied hero within 200 engine units. |

Featured heroes gain **6–12% combat power**, affecting attack power and durability within the existing power clamp. These are balance estimates, not historical win percentages. Auto-draft weights combine featured priority, broad strategic tags and position eligibility. Every eligible hero retains a positive chance; higher creativity softens featured priority. Hero IDs remain unique across both teams and the annual unlock pool is unchanged. Tags are authored proxies, not exact hero spells. Manual drafting, bans, hero proficiency and full playstyle/composition scoring remain future work.

Actual lane movement/combat and Ancient destruction still decide maps, including the existing bounded overtime rule. No patch chooses a winner.

## Research and limits

The importer cached **118 modern Valve patch-note responses**, a patch index, a hero index and seven early Steam announcement feeds. Original responses are in `scripts/data/patch-sources.json.gz`; builds and gameplay make no research requests.

Primary sources include the [Valve patch index](https://www.dota2.com/datafeed/patchnoteslist?language=english), [patch-note feed](https://www.dota2.com/datafeed/patchnotes?version=7.33&language=english), and [Valve's Steam announcements API](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=570&count=1000&maxlength=0&enddate=1514764800&feeds=steam_community_announcements,steam_updates). Research also inspected Valve's [7.00 gameplay](https://www.dota2.com/700/gameplay/), [6.84 gameplay](https://www.dota2.com/684/?l=english) and [7.06 gameplay](https://www.dota2.com/706/) pages.

The professional statistics archive returned an access challenge; research stopped there. **No verified pick/ban/win sample was recovered or fabricated.** Seven axes and hero priorities are editorial era estimates informed by version eras and recovered notes, not a mathematical average of every buff/nerf. A modern hero's expandable source note is its latest recovered change in the phase and can be a nerf; that note alone does not prove historical dominance.

Both 2011 phases are **limited/provisional**: primary pre-TI1 balance notes were not recovered. Lineage refers to the DotA/Dota 2 parity era; client and DotA version dates differ. 2012's phases intentionally share 6.74 context. The cache includes post-TI2026 7.41f, which is excluded from the TI2026 composite. Research is reviewed through October 22, 2026. Full historical balance reconstruction remains incomplete.

| TI season | Opening composite | Road-to-TI composite |
| --- | --- | --- |
| 2011 | 6.71–6.72c · The first lanes (provisional) | 6.72d · Summons and siege (provisional) |
| 2012 | 6.73–6.74 · Resources and reach | 6.74/client revisions · The great teamfight |
| 2013 | 6.75–6.77c · Catch and control | 6.78–6.78c · Pressure on every lane |
| 2014 | 6.79–6.80c · Supports on the move | 6.81–6.81b · Break the base early |
| 2015 | 6.82–6.83d · Defend and scale | 6.84–6.84c · Spell pressure |
| 2016 | 6.85–6.86f · Space for the carry | 6.87–6.88b · Flexible skirmish |
| 2017 | 6.88c–7.05 · A new growth curve | 7.06–7.06f · Lanes into objectives |
| 2018 | 7.07–7.15 · Win the opening | 7.16–7.19 · Fight for the recovery |
| 2019 | 7.19b–7.21d · Run at the lanes | 7.22–7.22f · Flexible cores and saves |
| 2020 | 7.22g–7.26c · An economy across the map | 7.27–7.27d · Carry timing windows |
| 2021 | 7.28–7.29d · Summons and sustain | 7.30–7.30d · Durable initiation |
| 2022 | 7.30e–7.31d · Control the tempo | 7.32–7.32c · Fight behind the aura |
| 2023 | 7.32d–7.33e · A wider economy | 7.34–7.34d · The durable core |
| 2024 | 7.34e–7.35d · Burst and punishment | 7.36–7.37c · Sustain and team identity |
| 2025 | 7.37d–7.38c · Follow the currents | 7.39–7.39d · Keep the pressure alive |
| 2026 | 7.39e–7.41c · New lanes, new growth | 7.41d–7.41e · Catch the next timing |

## Files and validation

Curated inputs: `scripts/data/patch-profiles.json`. Explicit fetch: `node scripts/import-patches.mjs`. Offline compilation: `node scripts/build-patches.mjs` writes `src/data/patches.json`. Runtime/timing/draft logic: `src/patches.ts`; combat: `src/battle.ts`; screen: `src/PatchMeta.tsx` and `src/patches.css`. The old `world.json.patch` object remains only for compatibility with existing data readers; the app and new match configs use the composite catalog.

Eight new tests cover all 32 profiles, cached-source traceability, both clocks/shuffle/TI/2020 boundaries, fictional seasons, draft bias/creativity/unlock rules, measured effects of all seven axes and both-side power, deterministic real maps/Ancient destruction, AI/managed worker equality, event pinning, mismatch rejection, compact scoreboards and save preservation. **153 application tests and the production build pass**, with the existing large-chunk warning.

Browser validation uses isolated **5304**: fresh TI1 entry, real AI-worker batch, managed-worker skip-to-results with `2011.2` retained, reopening both managed/AI scoreboards after reload, source disclosure links, contrasting 2015/2024 phases, and desktop/narrow light/dark layouts. Browser error logs are clear. Other local and hosted campaigns are preserved. Ignored preview: `.local/patches-preview.png`.
