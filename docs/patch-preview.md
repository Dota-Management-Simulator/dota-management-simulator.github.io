# Local patch preview

Run `npm run dev` and open the displayed localhost URL with `?patch-preview=2011.1`. The current running preview is [localhost:5323](http://127.0.0.1:5323/?patch-preview=2011.1).

The toolbar stays with the normal navigation:

- **Back / Next patch** move through the 32 catalogued season composites and two explicitly fictional 2027 samples. The endpoint buttons disable.
- **Jump to patch** goes straight to a selected composite. Its real-version lineage appears in the picker.
- **Jump to event or TI** starts the sandbox on a dated menu screen: each client event's first day (2012–2025) and each TI preparation month (TI2 to TI 2026), 28 moments in all. The URL records it as `&date=YYYY-MM-DD`, for example [Wraith-Night](http://127.0.0.1:5323/?patch-preview=2014.1&date=2013-12-12). Dates not on the list fall back to the patch start.
- **Patch notes / Desk** switch between the existing interactive notes and the evolving dashboard. All normal management destinations remain available.
- **Exit preview** returns to the ordinary app and its saved campaign.

Each jump starts a fresh in-memory campaign using that composite's exact proxy date, matching completed annual imports and hero releases. No elapsed-week training, payroll or match simulation runs to make a jump. The current management screen stays selected, so Next while reading notes shows the next notes immediately. The URL records the selected patch; reloading reconstructs its fresh sandbox and starts at the Desk. These are the existing compressed composites, not every Valve patch or original historical client.

Ordinary actions, including Continue, hiring and player configuration, work inside the sandbox. Each jump or reload discards those edits. Existing worker locks still apply while a simulation or dialog is active. Campaign storage is neither read at initialization nor written by App autosave; theme preferences remain shared with the normal app. The dynamic preview entry is gated by `import.meta.env.DEV` and is absent from the production output.

Implementation: `PatchPreview.tsx` supplies preview controls and a disposable campaign to the existing App, with fixtures isolated in `patch-preview.ts`. The normal App entry and save schema remain unchanged.

Validation: all 249 tests pass. Two focused tests cover all 34 composites, exact dates, release pools, fresh finances/rosters, lack of progression, invalid-ID fallback and creation without storage access. TypeScript/production build pass with the existing chunk warning; production output contains no preview module. Browser QA on port 5323 covers Back/Next, direct 7.00/Frontiers/future jumps, notes retention, Desk navigation, disabled endpoints, and a real Continue changing sandbox date/cash followed by a fresh patch reset. An ignored QA page records zero campaign-save writes and unchanged stored bytes throughout these actions. A 390px iframe verifies the toolbar and lobby fit without horizontal overflow (375px content viewport with scrollbar). No source push or deployment.
