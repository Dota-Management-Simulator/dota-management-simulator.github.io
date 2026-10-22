# Team logos and club colors

Implemented October 22, 2026. Open the gear button → **Organization settings → Team identity**. Custom campaign setup includes the same editor before starting the campaign. Organization settings allow any managed club, including an existing historical or legacy club, to customize its badge.

Published from source `a52ef20` as GitHub Pages deployment `ec251a6`. Pages reports **built**; public HTML, CSS, every JavaScript chunk, both workers and favicon match the production build. The hosted-browser check confirmed the new controls on the existing legacy save without changing its logo, week or balance.

Choose **Upload a logo** for a PNG, JPEG or WebP up to 5 MB, or **Create a crest** for a shield, round or diamond badge with a star, lightning bolt or crown and up to three initials. The preview updates immediately. Primary and secondary color pickers control crests and the app's club palette. Remove custom logo restores the historical era badge, or initials for a custom/legacy team; it retains the selected colors and theme preference.

Uploaded images are decoded locally, fitted without cropping into a square, and re-encoded at 256, 192 or 128 pixels with a maximum 180,000-character data URL. Images over 40 megapixels are rejected. Object URLs are released after import. The input resets so the same file can be chosen again; failed imports retain the current logo. There is no server upload. The image lives in the existing browser campaign save, subject to the existing autosave/storage-error indicator.

Image colors are suggestions, not verified brand specifications. Sampling ignores transparent and near-neutral background pixels and groups similar colors by visible coverage with a saturation weight. Uploads suggest two colors; monochrome images retain the chosen colors. Historical clubs without explicit branding derive an automatic palette from their current bundled era logo when usable colored pixels exist. Missing/neutral artwork keeps the original theme until the manager chooses colors. Custom clubs start with the Aegis green/gold palette.

Historical organization selection now previews those colors before starting a campaign, including the setup cards, era/difficulty choices and campaign artwork. Selecting another club or year follows the actually displayed club and its era logo, including the fallback club when a prior selection is unavailable. Previewing does not modify an existing campaign. The isolated 5196 browser check verifies switching Na`Vi/EHOME in both themes; the five branding tests and production build pass.

This preview correction is published from `2ff2259` as Pages deployment `798cabb`, verified built with public asset/worker checksums matching the build.

**Use team colors** is checked by default. Unchecking restores the original cream or forest-green theme immediately while retaining the logo and palette. The separate Light/Dark choice still works. Colors tint backgrounds, panels, sidebar, primary buttons, navigation, hero cards and accents; body, button and active-navigation text use contrast-adjusted colors. Statistical charts, combat side colors and result semantics retain their own meanings.

## Save and identity behavior

`Settings.branding` is optional and stores `primary`, `secondary`, `useTeamColors` and an optional uploaded image or crest descriptor. Version 1 and the campaign storage key remain unchanged. Existing saves load without requiring branding. Invalid colors fall back to defaults; unsupported, external, SVG and oversized saved image payloads are ignored. Branding survives normal campaign transitions, weekly payroll, annual imports and reloads; it changes no finances, roster ownership or match inputs.

Managed badges use one React identity context, keyed by the exact managed club ID (or exact name in a legacy save). The same customization appears in the sidebar, world clubs, pre-match, tournament matches, playback and scoreboards. Opponents keep their own historical badges. A replacement custom club never inherits the replaced club's branding, and switching campaign setup club types clears the previous draft branding.

## Validation

Five new tests cover campaign/save/annual-transition preservation, invalid saved values and payload bounds, extreme-color text contrast in both modes, image palette sampling and unsupported/oversized upload guards. The full suite has **104 passing tests** and the production build passes with the existing chunk-size warning.

Browser QA on isolated port **5195** covered custom setup and crest preview, actual PNG file selection and color extraction, picker changes, rejected SVG preserving the current image, original-theme restoration, logo/colors/unchecked preference after reload, historical automatic colors and malformed optional branding. Mobile settings were inspected at 390 pixels in light and dark mode, including responsive crest controls. Ignored `.local/branding-*` fixtures and screenshots do not modify the normal app or hosted saves.
