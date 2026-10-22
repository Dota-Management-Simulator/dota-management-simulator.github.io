export type CrestShape = "shield" | "round" | "diamond";
export type CrestSymbol = "star" | "bolt" | "crown";
export type ClubLogo = { kind: "upload"; dataUrl: string } | {
  kind: "crest"; shape: CrestShape; symbol: CrestSymbol; text: string;
};
export interface ClubBranding {
  primary: string;
  secondary: string;
  useTeamColors: boolean;
  logo?: ClubLogo;
}
export const DEFAULT_BRANDING: ClubBranding = { primary: "#405c46", secondary: "#dfbc72", useTeamColors: true };
export const MAX_LOGO_LENGTH = 180000;
export const validColor = (value: unknown): value is string => typeof value === "string" && /^#[a-f\d]{6}$/i.test(value);
export function normalizeBranding(value: unknown): ClubBranding {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<ClubBranding>;
  const branding: ClubBranding = {
    primary: validColor(raw.primary) ? raw.primary : DEFAULT_BRANDING.primary,
    secondary: validColor(raw.secondary) ? raw.secondary : DEFAULT_BRANDING.secondary,
    useTeamColors: raw.useTeamColors !== false,
  };
  const logo = raw.logo;
  if (logo?.kind === "upload" && typeof logo.dataUrl === "string" && logo.dataUrl.length <= MAX_LOGO_LENGTH &&
    /^data:image\/(png|jpeg|webp);base64,[a-z\d+/]+=*$/i.test(logo.dataUrl)) branding.logo = { kind: "upload", dataUrl: logo.dataUrl };
  if (logo?.kind === "crest") branding.logo = {
    kind: "crest", shape: ["shield", "round", "diamond"].includes(logo.shape) ? logo.shape : "shield",
    symbol: ["star", "bolt", "crown"].includes(logo.symbol) ? logo.symbol : "star",
    text: typeof logo.text === "string" ? Array.from(logo.text.trim()).slice(0, 3).join("").toUpperCase() : "",
  };
  return branding;
}
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hex = (channels: number[]) => "#" + channels.map(n => Math.round(n).toString(16).padStart(2, "0")).join("");
export function mix(a: string, b: string, fraction: number) {
  const other = rgb(b);
  return hex(rgb(a).map((n, i) => n * (1 - fraction) + other[i] * fraction));
}
function luminance(color: string) {
  const c = rgb(color).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
export function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}
export function readableText(background: string) {
  return contrast(background, "#ffffff") >= contrast(background, "#111111") ? "#ffffff" : "#111111";
}
function accessibleAccent(color: string, background: string) {
  const target = readableText(background);
  for (let i = 0; i <= 20; i++) {
    const candidate = mix(color, target, i / 20);
    if (contrast(candidate, background) >= 4.5) return candidate;
  }
  return target;
}
/** Only presentation tokens: simulation, chart sides and outcome colors stay independent. */
export function teamTheme(value: ClubBranding, dark: boolean): Record<string, string> {
  const { primary, secondary } = normalizeBranding(value);
  const bg = mix(primary, dark ? "#111315" : "#fcfbf8", dark ? .93 : .97);
  const surface = mix(primary, dark ? "#1d2024" : "#ffffff", dark ? .91 : .985);
  const sidebar = mix(primary, "#101216", .82);
  const button = accessibleAccent(primary, surface);
  return {
    "--bg": bg, "--ink": dark ? "#edf0f4" : "#24262b", "--muted": dark ? "#b6bdc8" : "#636976",
    "--line": mix(primary, dark ? "#39404a" : "#dee1e7", .90),
    "--surface": surface, "--surface-raised": mix(primary, dark ? "#292e35" : "#ffffff", .88),
    "--surface-soft": mix(primary, dark ? "#232830" : "#f4f5f8", .9), "--sidebar": sidebar,
    "--green": button, "--gold": accessibleAccent(secondary, surface),
    "--club-button": button, "--club-button-text": readableText(button),
    "--club-accent": accessibleAccent(secondary, sidebar),
    "--club-hero": mix(primary, "#111319", .62), "--club-hero-end": mix(primary, "#111319", .82),
  };
}
/** Ignore transparency/near-neutral pixels; rank quantized colors by visible coverage. */
export function paletteFromPixels(pixels: ArrayLike<number>): Pick<ClubBranding, "primary" | "secondary"> | undefined {
  const bins = new Map<string, { sum: number[]; count: number; weight: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const range = Math.max(...channels) - Math.min(...channels);
    if (range < 24) continue;
    const key = channels.map(n => Math.floor(n / 32)).join(",");
    const bin = bins.get(key) ?? { sum: [0, 0, 0], count: 0, weight: 0 };
    channels.forEach((n, c) => bin.sum[c] += n);
    bin.count++; bin.weight += .5 + range / 510; bins.set(key, bin);
  }
  const ranked = [...bins.values()].sort((a, b) => b.weight - a.weight);
  if (!ranked.length) return undefined;
  const first = ranked[0].sum.map(n => n / ranked[0].count);
  const second = ranked.slice(1).find(b => Math.hypot(...b.sum.map((n, i) => n / b.count - first[i])) > 100);
  return { primary: hex(first), secondary: second ? hex(second.sum.map(n => n / second.count)) : DEFAULT_BRANDING.secondary };
}
