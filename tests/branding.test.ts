import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, DEFAULT_BRANDING, MAX_LOGO_LENGTH, normalizeBranding, paletteFromPixels, teamTheme } from "../src/branding";
import { importClubLogo } from "../src/branding-images";
import { advanceWeek, createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";

test("club identity survives weekly progression, annual imports and the existing save slot without changing club ownership", () => {
  const branding = { primary: "#a82244", secondary: "#18d9cc", useTeamColors: false,
    logo: { kind: "crest" as const, shape: "diamond" as const, symbol: "bolt" as const, text: "ZEN" } };
  let campaign = createCampaign({ ...DEFAULT_SETTINGS, clubMode: "custom", team: "Zenith Club", branding });
  const roster = [...campaign.roster], cash = campaign.cash;
  const store = new Map<string, string>([[SAVE_KEY, JSON.stringify(campaign)]]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null } });
  try {
    const loaded = readSave()!;
    assert.deepEqual(loaded.settings.branding, branding);
    assert.deepEqual(loaded.roster, roster); assert.equal(loaded.cash, cash);
    // Keep this identity fixture content; departures are covered independently.
    for (const id of campaign.roster) campaign.training[id] = "Rest";
    for (let i = 0; i < 18; i++) campaign = advanceWeek(campaign);
    assert.deepEqual(campaign.settings.branding, branding);
    assert.equal(campaign.world?.managedTeamId, "managed-custom");
    assert.deepEqual(campaign.roster, roster);
    const legacy = createCampaign(DEFAULT_SETTINGS);
    delete legacy.settings.branding; store.set(SAVE_KEY, JSON.stringify(legacy));
    assert.equal(readSave()!.settings.branding, undefined);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("branding normalizes malformed optional save fields and rejects remote, SVG and oversized logo payloads", () => {
  assert.deepEqual(normalizeBranding({ primary: "red", secondary: null, logo: { kind: "upload", dataUrl: "https://example.com/logo.png" } }), DEFAULT_BRANDING);
  for (const dataUrl of ["data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64," + "A".repeat(MAX_LOGO_LENGTH), "javascript:alert(1)"]) {
    assert.equal(normalizeBranding({ logo: { kind: "upload", dataUrl } }).logo, undefined);
  }
  const logo = { kind: "upload" as const, dataUrl: "data:image/webp;base64,UklGRg==" };
  assert.deepEqual(normalizeBranding({ logo }).logo, logo);
  const malformed = normalizeBranding({ logo: { kind: "crest", shape: "unknown", symbol: null, text: 12 } });
  assert.deepEqual(malformed.logo, { kind: "crest", shape: "shield", symbol: "star", text: "" });
});

test("club palettes keep body text, primary buttons and active sidebar text readable for extreme team colors in both themes", () => {
  for (const dark of [false, true]) for (const primary of ["#000000", "#ffffff", "#ffff00", "#0000ff", "#ff00ff", "#99ffff", "#f90000"]) {
    const tokens = teamTheme({ primary, secondary: primary, useTeamColors: true }, dark);
    for (const [foreground, background] of [["--ink", "--bg"], ["--muted", "--surface"], ["--green", "--surface"], ["--club-button-text", "--club-button"], ["--club-accent", "--sidebar"]])
      assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, `${primary} ${dark} ${foreground}`);
    assert.notEqual(tokens["--bg"], teamTheme({ ...DEFAULT_BRANDING, primary: "#229944" }, dark)["--bg"]);
  }
});

test("image palette ignores invisible/neutral backgrounds and picks distinct colors by coverage", () => {
  const pixels = [...Array(100).fill([255, 255, 255, 255]).flat(), ...Array(50).fill([255, 0, 0, 0]).flat(),
    ...Array(30).fill([160, 32, 64, 255]).flat(), ...Array(20).fill([16, 192, 224, 255]).flat()];
  assert.deepEqual(paletteFromPixels(pixels), { primary: "#a02040", secondary: "#10c0e0" });
  assert.equal(paletteFromPixels([0, 0, 0, 255, 255, 255, 255, 255]), undefined);
});

test("logo uploads reject unsupported and oversized files before decoding", async () => {
  await assert.rejects(importClubLogo(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" })), /PNG, JPEG or WebP/);
  await assert.rejects(importClubLogo(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })), /smaller than 5 MB/);
});
