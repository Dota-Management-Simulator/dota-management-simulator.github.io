# Manager’s Desk game hub

October 23, 2026. Local implementation, not published.

**Superseded presentation:** the user subsequently requested a Dota main menu instead of the village scene. See [the current Dota client presentation](dota-menu.md). The notes below preserve the earlier navigation implementation and its real calendar/tournament validation; the current menu keeps those flows, using top tabs and a persistent lower campaign bar.

The Manager’s Desk is the main menu. The previous desktop sidebar and phone navigation drawer have been removed. Following the user’s request for a stronger game feel, six circular controls now form a compact game HUD on the right: Desk, Squad, Practice, Compete, World and Club. Panels open inward. At 900px and below, the controls form a floating bottom dock, with panels opening above it. Desk opens the main menu directly; each other control reveals its destinations.

| Button | Destinations |
| --- | --- |
| Squad | Squad, Player scouting, Staff |
| Practice | Training, Scrims |
| Compete | Season calendar, Scout your next series, TI race & standings |
| World | Heroes, Patch & meta, Teams |
| Club | Inbox, Finances & sponsors, Season history |

The Desk opens on an illustrated headquarters scene with five interactive locations: Squad lodge, Training grounds, The arena, Watchtower and Club house. Selecting a location reveals its real management screens in an animated panel. This replaces the first pass’s five destination cards. A next-challenge panel opens the existing competition flow, while a five-player strip opens saved player profiles and shows current energy. The inbox decisions, competition summary, TI race, squad readiness, activity and latest result remain below the scene. These summaries continue to use saved campaign data.

The environment is original AI-generated decorative artwork, bundled locally as `public/art/headquarters-v1.png`; it depicts menu locations rather than historical club facilities or new upgrade mechanics. Firefly and hover animations add motion without introducing random gameplay values. [Artwork provenance and exact prompt](headquarters-art.md).

Every management screen has a persistent **Back to Desk** button in the top bar. The Aegis mark and Desk circle also return there. App-level player, history, handbook and settings dialogs offer Back to Desk as well as their existing close control. Nested tournament, preparation and result screens retain their existing return/continue controls; finish or cancel the active flow before leaving. Reload starts at the Desk with the existing campaign.

Panels open by click, tap or keyboard activation. Each navigation surface shows one panel at a time. Selecting a destination, pressing Escape, clicking outside or moving keyboard focus outside closes it. Map panels focus their first option and return focus to the location on Escape or Back; rail panels return focus to the circle. Screen changes focus the page heading. Buttons expose expanded and current states. On phones, location panels scroll into view above the dock, and the starting five scroll horizontally inside their strip. Reduced-motion preferences disable animations. Both appearance modes and club colors remain supported; the scene/HUD retain their own readable forest/gold palette.

Date, cash, recurring finances and Continue remain in the sticky campaign controls. During tournament computation, preparation, playback and result review, or an active scrim, screen navigation and campaign replacement are disabled alongside Continue. This preserves the mounted worker and its existing completion/cancellation flow. Theme/settings and handbook access remain available. No new clock, save fields, combat rules or economy mechanics are introduced.

## Validation

- All 240 application tests pass. TypeScript and production build pass with the existing bundle-size warning.
- Browser QA on isolated `http://127.0.0.1:5323/` exercises all fourteen destination screens through the map, Back to Desk, right-side and bottom-dock options, player-strip profiles, match-centre entry, keyboard opening/Escape/focus return and save reload. Final scene browsing retains August 17, 2011, $76,000, the saved Natus Vincere lineup and the next TI fixture.
- Browsing retains July 17, 2011, $100,000 and the Natus Vincere five. Real Continue advances to July 24 with $94,000 and the ordinary 2011.2 patch introduction; subsequent advancement stops at TI’s August 17 invitation.
- A real TI1 worker run reaches the manager’s BO1 against Scythe Gaming. The map completes at 22:34, settles once through Finish series / Continue tournament, unlocks navigation and returns to the Desk; the tournament and next fixture survive reload. Navigation is visibly disabled during computation, drafting and result review.
- Responsive checks cover 320px, 390px, 900px, 950px and 1440px, light/dark club appearance, inward/upward popover containment and the shrinking Desk grid. The actual draft-preparation flow disables navigation; Back without playing restores it, and Back to Desk returns to the scene.
- Existing local/hosted saves and independent CPU calibration jobs are untouched. No push, deployment or Discord message.
