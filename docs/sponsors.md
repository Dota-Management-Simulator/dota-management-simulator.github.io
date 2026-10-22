# Sponsors, eras and exclusive agreements

Researched **October 21, 2026**. Implemented locally; not deployed.

The catalog contains **42 real brands** from Dota and other esports. An entry year is a documented reference or a conservative first catalog appearance, not necessarily the brand's first esports investment. The source notes distinguish dated announcements, retrospective evidence and current-page observations. There is no claim that these partnerships ran continuously from 2012 to the present.

## Game rules

- A brand can hold **one active team agreement worldwide**. Every club can hold **at most five**. Multiple brands in the same product category are allowed. Real brands often sponsor several organizations simultaneously; this exclusivity is the user's alternate-history rule.
- At campaign creation, eligible historical associations seed some AI club holdings where the actual club ID exists and has capacity. The managed club begins with no new inherited sponsors, preserving the prior campaign setup. Payments, remaining durations and holders are explicitly simulated; source associations are shown separately. Cross-esport/event associations need not exist as Dota clubs and begin available.
- New brands unlock at the start of their catalog year, independently of player/hero shuffles. The game's 18-week calendar cannot reproduce exact announcement dates. Brands remain in the alternate-history pool after unlocking, including beyond 2026; this does not assert a continuing real partnership.
- Negotiate **weekly support, signing bonus, 6/18/36 weeks and 0/1/2 media hours per starter per week**. A submitted acceptable offer signs immediately; a counteroffer must be loaded and resubmitted. Reputation gates remain. The opening ask can exceed a sponsor's budget.
- Acceptance compares weekly support plus the bonus amortized over the term against an illustrative budget. More reputation, media hours and term security improve the budget. Rejection/counters do not mutate state or pay money. Input bounds reject nonfinite/fractional dollars and unsupported terms.
- Signing pays the bonus once. Weekly support pays once on each weekly transition while active. A deal signed at week 1 for six weeks pays on transitions out of weeks 1–6 and expires upon reaching week 7. Event time jumps use these same transitions; terms carry across season boundaries.
- Active agreements cannot be poached or renewed early. Expiry ends income, benefits and media obligations and frees the slot. The brand can then negotiate with another team, including its former holder. AI clubs cannot take a newly released brand until at least two clock increments after release, giving the manager a full open week. AI signatures use deterministic scheduling, obey exclusivity/capacity, and also expire.
- Archived AI clubs release their brands on the next weekly market reconciliation. Historical roster imports never overwrite a managed sponsor agreement.
- AI clubs participate in sponsor ownership only: the existing game has no AI financial ledger or weekly AI training economy. Sponsorships do not add direct combat damage or independent win rolls.

## Benefits and commitments

All amounts and benefits are **gameplay placeholders**, not researched prices, real company promises, claims of endorsement or measured product effects.

| Partner benefit | Weekly managed-team effect | Combined cap |
| --- | --- | --- |
| Equipment / hardware | +0.10 attribute development before media adjustment | +0.30 together with applicable analytics |
| Furniture / logistics / wellness | +2 energy per starter | +6 before media costs |
| Lifestyle / food | +1 happiness per starter | +3 |
| Analytics | +0.10 development when training Vision, Intuition or Map awareness | Shares +0.30 attribute cap |
| Audience / commercial | +0.25 reputation | +0.50 |

Attribute benefits scale by the existing practice volume ratio; they do not increase playstyle ratings and give no growth during Rest. Media obligations reduce all attribute/playstyle development by 5% per aggregate hour, capped at a 50% reduction, and consume one energy per aggregate hour per starter. Media obligations still occur during a Rest week. Player contractual practice-hour limits apply to practice; media time is shown separately. Bonuses, costs, rounding and existing skill/playstyle/energy caps all apply in weekly simulation and live training previews. Debt retains its existing happiness penalty.

Example: one equipment deal and one analytics deal, training Vision at the original Normal workload, give `(1 + 0.10 + 0.10) × 0.90 = 1.08` growth with two total media hours. A furniture sponsor's +2 energy offsets those two media energy costs. No combat result is fabricated from the brand name.

## Compatibility and implementation

`Campaign.sponsorships` is optional and contains active market deals and release timestamps using the existing `year * 18 + week - 1` clock. `sponsorIds` retains the original fictional MONOLITH/PULSE/ORBIT agreements. Already signed fictional deals preserve rolling income, incur no invented obligations and count toward five slots; new offers in the interface use the sourced catalog. The legacy `signSponsor` transition remains for compatibility and also checks capacity.

Loading an older save initializes only the missing market after the established historical catch-up. It does not change balances, transactions, results, dates, players, training or existing agreements. Negotiated terms and world ownership serialize with the existing save slot/key. Opening an offer is transient UI state.

Sources live in `src/data/sponsors.json`; rules in `src/sponsors.ts`; the finance interface in `src/SponsorMarket.tsx` and `src/sponsors.css`. `game.ts` handles weekly market settlement; `contracts.ts` includes the benefits in `weeklyPractice`, keeping training previews and weekly results consistent.

## Corrections and unresolved leads

- **BACKFORCE makes chairs**, and NAVI's announcement is dated September 19, 2022. It is not an energy drink sponsor dating to 2012.
- **VPGAME is an esports services platform**, not a hardware/peripherals manufacturer. The catalog uses a July 2015 EHOME sponsorship report.
- Razer's EHOME announcement is July 2012. Its earlier 2011 catalog entry is supported by its separate Team Liquid relationship. GIGABYTE/AMD enter from a 2012 tournament announcement, which does not verify EHOME sponsorship dates.
- SteelSeries/OG is dated July 2019, Logitech G/NAVI January 2020, white.market/NAVI November 2024, Napster/NAVI June 2025, and Duelbits/Liquid November 2025. The last three are explicitly associated with other game divisions in their sources.
- HUYA's 2019 catalog entry is supported by Liquid's official announcement; this does not establish EHOME's HUYA start date.
- **TLCBET/EHOME and Scan UK/OG remain research leads, excluded pending stronger dated evidence.** No 2012 dates were invented. Abios and PrivatBank use conservative 2026 official-page observations. Hypersolid, Visa and Zenni also use conservative 2026 catalog entries where earliest dates remain unverified.
- Selected sources are secondary: SteelSeries/NAVI via HLTV, HyperX/Alliance via GameSpot/onGamers, VPGAME/EHOME via 17173 and CHERRY/EHOME via a reproduced roster announcement on Te5. Most remaining entries use organizations, brands or their issued releases. This is selected coverage, not a complete sponsor archive.

## Catalog and source ledger

Each link supports the association/era note, not the simulated financial package or exclusive holder. Catalog year is intentionally distinct from announcement precision.

Validation: all **61 tests pass**, including nine sponsor checks for catalog/club identity integrity, era gating, deterministic negotiation tradeoffs, atomic signing, exclusivity, caps including legacy deals, exact expiry/payroll, AI turnover through annual imports, live weekly benefits, event time jumps and save round trips. The production build passes. Browser checks on a separate test origin covered 2011/2026 catalogs, counteroffers, signing, exact six-week expiry/payments, reload persistence, training preview versus weekly recovery, search/rival filters and both light/dark themes. Responsive styles are included; mobile viewport automation was not performed.

| Catalog year | Brand | Category | Sourced association | Evidence |
| --- | --- | --- | --- | --- |
| 2011 | Alienware | Gaming PCs | Team Liquid · multi-esport | [2021 ten-year retrospective](<https://teamliquid.com/news/2021/01/26/aw-x-tl-the-legacy-duo-start-their-second-act>) |
| 2011 | EIZO | Monitors | Fnatic · multi-esport | [May 24, 2011; announced 2011–12 affiliation](<https://www.eizo.com/news/eizo-monitors-fnatic-fnatic-powered-by-the-award/>) |
| 2011 | MSI | PC hardware | Fnatic · multi-esport | [2008 partnership; opening-era availability](<https://storage-asset.msi.com/file/pdf/2019_msi_csr_eng.pdf>) |
| 2011 | Razer | Gaming peripherals | Team Liquid · StarCraft II | [2012 renewal explicitly describes 2011 partnership; EHOME added in 2012](<https://www.razer.com/newsroom/esports-partnerships/team-liquid-and-razer-take-their-natural-expo>) |
| 2011 | SteelSeries | Gaming peripherals | NAVI · Counter-Strike / DotA | [2011 NAVI announcement; OG announced separately in 2019](<https://www.hltv.org/news/5876/navi-land-steelseries-sponsorship>) |
| 2012 | AMD | Processors / graphics | joinDOTA Masters / Open · tournament partner | [May 8, 2012 event sponsorship](<https://www.gigabyte.com/Press/News/1119>) |
| 2012 | GIGABYTE | PC components / event support | joinDOTA Masters / Open · tournament partner | [May 8, 2012 event sponsorship; not evidence of an EHOME deal](<https://www.gigabyte.com/Press/News/1119>) |
| 2014 | HyperX | Gaming headsets / peripherals | Alliance · Dota 2 | [February 3, 2014 announcement; conservative catalog entry](<https://www.gamespot.com/articles/alliance-now-sponsored-by-hyperx/1100-6437018/>) |
| 2015 | VPGAME | Esports services platform | EHOME · Dota 2 | [July 21, 2015 report of EHOME sponsorship](<https://dota2.17173.com/news/07212015/142441587.shtml>) |
| 2016 | CHERRY | Keyboards / switches | EHOME · Dota 2 | [2016 EHOME roster announcement reproduced by Te5 credits CHERRY](<https://m.te5.com/dota2/2016/119145.html>) |
| 2016 | Monster Energy | Energy / lifestyle | Team Liquid · multi-esport | [November 15, 2016 Liquid announcement](<https://teamliquid.com/news/2016/11/15/unleashing-a-new-partnership-with-monster-energy>) |
| 2017 | GG.BET | Betting platform | Team Secret · multi-esport | [October 17, 2017 Team Secret announcement](<https://gg.bet/news/gg-bet-becomes-an-official-partner-of-team-secret>) |
| 2017 | Red Bull | Energy / lifestyle | OG · Dota 2 | [TI7 partnership announcement video](<https://www.redbull.com/fr-fr/videos/og-red-bull-annonce-video>) |
| 2018 | CORSAIR | Gaming peripherals | Team Secret · Dota 2 | [March 29, 2018 announcement](<https://www.corsair.com/newsroom/press-release/corsair-and-team-secret-announce-2018-partnership>) |
| 2018 | DHL | Logistics | ESL · tournament partner | [May 22, 2018 ESL announcement; tournament partner adapted for club gameplay](<https://eslfaceitgroup.com/press/dhl-and-esl-cooperate-to-embrace-the-future-of-digital-sports/>) |
| 2018 | SAP | Analytics / enterprise software | Team Liquid · multi-esport | [2021 extension states partnership began in 2018](<https://teamliquid.com/news/2021/05/24/team-liquid-extends-sap-analytics-partnership>) |
| 2018 | Vodafone | Telecommunications | ESL · tournament partner | [May 9, 2018 ESL announcement; tournament partner adapted for club gameplay](<https://esl.com/article/vodafone-and-esl-announce-international-esports-partnership-2/>) |
| 2019 | Acer Predator | Gaming PCs / monitors | Team Envy · multi-esport | [March 28, 2019 Acer-issued release](<https://www.prweb.com/releases/acer_partners_with_leading_worldwide_esports_organization_team_envy_as_part_of_content_and_sponsorship_package/prweb16203090.htm>) |
| 2019 | Honda | Automotive | Team Liquid · multi-esport | [2019 announcement; not a claim of continued Liquid partnership](<https://hondanews.com/en-US/releases/release-b483e8ddee1e4ec398262f73f812654a-honda-ups-its-game-with-gamers-partnering-with-team-liquid-and-twitch>) |
| 2019 | HUYA | Livestreaming platform | Team Liquid · livestreaming | [June 21, 2019 Liquid announcement; EHOME dates not yet verified](<https://teamliquid.com/news/2019/06/21/team-liquid-partners-with-huya>) |
| 2019 | Jersey Mike’s | Food / restaurant | Team Liquid · multi-esport | [January 16, 2019 Liquid announcement](<https://teamliquid.com/news/2019/01/16/upgrading-the-roster-with-jersey-mikes-subs>) |
| 2019 | Socios.com | Fan engagement / tokens | OG · Dota 2 | [2019 partnership announcement](<https://ogs.gg/og-becomes-the-firs-esports-club-in-the-world-to-use-the-blockchain-to-better-interact-with-its-fans-2/>) |
| 2020 | BMW | Automotive | Cloud9, Fnatic, FPX, G2 and T1 · League of Legends | [April 16, 2020 announcement includes five clubs](<https://www.press.bmwgroup.com/usa/article/detail/T0307618EN_US/bmw-expands-esports-platform-announces-global-partnerships-which-include-content-creation-education-information-sharing-and-technology-initiatives?language=en_US>) |
| 2020 | Logitech G | Gaming peripherals | NAVI · multi-esport | [January 16, 2020 NAVI announcement; conservative catalog entry](<https://navi.gg/en/publications/5345-logitech-g-is-a-new-partner-of-navi>) |
| 2020 | Samsung Odyssey | Gaming monitors | T1 · multi-esport | [May 26, 2020 T1 announcement](<https://news.samsung.com/us/samsung-esports-t1-official-display-partner-odyssey-gaming-monitors-g7-g9/>) |
| 2020 | Secretlab | Chairs / desks | Team Liquid · multi-esport | [April 21, 2020 Liquid announcement; conservative catalog entry](<https://blog.secretlab.co/stories/secretlab-liquid/>) |
| 2021 | Coinbase | Crypto exchange | Team Liquid · multi-esport | [November 10, 2021 four-year Liquid announcement](<https://teamliquid.com/news/2021/11/10/team-liquid-coinbase-look-to-a-limitless-future>) |
| 2021 | IMC Trading | Trading / technology | Team Liquid · multi-esport | [February 23, 2021 Liquid announcement](<https://teamliquid.com/news/2021/02/23/team-liquid-partners-with-imc>) |
| 2021 | PUMA | Apparel | NAVI · multi-esport | [June 21, 2021; announced three-year NAVI term](<https://navi.gg/en/publications/8411-navi-x-puma-3-years>) |
| 2022 | BACKFORCE | Gaming chairs | NAVI · multi-esport | [September 19, 2022 NAVI announcement](<https://navi.gg/en/publications/navi-x-backforce>) |
| 2022 | Thorne | Health / wellness | Team Liquid · multi-esport | [2022 joint partnership release](<https://s28.q4cdn.com/220021121/files/doc_news/THORNE-AND-TEAM-LIQUID-ANNOUNCE-PARTNERSHIP-BRINGING-INNOVATIVE-HEALTH-AND-WELLNESS-SOLUTIONS-TO-THE-ESPORTS-COMMUNITY-2022.pdf>) |
| 2024 | Valhalla.Game | Blockchain game | OG · multi-esport | [2024 OG announcement](<https://ogs.gg/og-esports-partners-with-valhalla/>) |
| 2024 | white.market | CS2 skin marketplace | NAVI · CS2 | [November 16, 2024 NAVI announcement](<https://navi.gg/en/publications/navi-x-whitemarket>) |
| 2025 | Blacklyte | Gaming furniture | Team Liquid · multi-esport | [June 12, 2025 brand announcement](<https://www.linkedin.com/posts/blacklyte_were-proud-to-officially-join-forces-with-activity-7339354743451852801-olUG>) |
| 2025 | Duelbits | Crypto casino / betting | Team Liquid · CS2 | [November 28, 2025 announcement specifies CS2 title sponsorship](<https://teamliquid.com/news/team-liquid-partners-with-duelbits>) |
| 2025 | Napster | Music / creative technology | NAVI · LoL / VALORANT | [June 13, 2025 announcement specifies LoL / VALORANT](<https://navi.gg/en/publications/navi-enters-lec>) |
| 2026 | Abios | Esports data / technology | NAVI · organization partner | [Observed on official Ukrainian partner page October 21, 2026; earliest start unverified](<https://navi.gg/ua/company/partners>) |
| 2026 | Hypersolid | Technology / brand experience | Team Liquid · organization partner | [Observed on official partner page October 21, 2026; earliest start unverified](<https://teamliquid.com/partners>) |
| 2026 | Limitless | Prediction market | NAVI · organization partner | [June 2026 partner newsletter; earliest start unverified](<https://limitless.exchange/blog/the-huddle-issue-01-jun-30th>) |
| 2026 | PrivatBank | Banking | NAVI · organization collaboration | [Official co-branded page observed October 21, 2026; earliest start unverified](<https://privatbank.navi.gg/>) |
| 2026 | Visa | Payments | Team Liquid · Brazilian VALORANT | [Observed on official partner page October 21, 2026; earliest start unverified](<https://teamliquid.com/partners>) |
| 2026 | Zenni | Eyewear | Team Liquid · organization partner | [Observed on official partner page October 21, 2026; earliest start unverified](<https://teamliquid.com/partners>) |
