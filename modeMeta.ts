import {
  MODE_META,
  type ModeAppearance,
  type PermissionMode,
  type RgbColor,
} from "./types.ts";
export function modeMetaTitle(mode: PermissionMode): string {
  return MODE_META[mode].title;
}
export function modeMetaShortTitle(mode: PermissionMode): string {
  return MODE_META[mode].shortTitle;
}
export function modeMetaSymbol(mode: PermissionMode): string {
  return MODE_META[mode].symbol;
}
export function modeMetaColor(
  mode: PermissionMode,
): "text" | "muted" | "accent" | "warning" | "error" | "success" | "dim" {
  return MODE_META[mode].color;
}
/** Claude Code's exact color for this mode, as `rgb()` channels. */
export function modeMetaRgb(
  mode: PermissionMode,
  appearance: ModeAppearance = "dark",
): RgbColor {
  return MODE_META[mode].palette[appearance];
}
/** Same color as `modeMetaRgb`, as `#rrggbb`. */
export function modeMetaHex(
  mode: PermissionMode,
  appearance: ModeAppearance = "dark",
): string {
  const { r, g, b } = modeMetaRgb(mode, appearance);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
export { MODE_META, type PermissionMode } from "./types.ts";
