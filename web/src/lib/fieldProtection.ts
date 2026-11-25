/**
 * Mirrors the Rust `respect_protected_fields` merge in `opentake-ops`.
 * The desktop command is authoritative; this keeps the in-memory shell honest.
 */

import type { Clip, ProtectedField, TextStyle, TextStylePatch, Transform } from "./types";

const DEFAULT_STYLE: TextStyle = {
  fontName: "Helvetica-Bold",
  fontSize: 96,
  fontScale: 1,
  color: { r: 1, g: 1, b: 1, a: 1 },
  alignment: "center",
  shadow: {
    enabled: true,
    color: { r: 0, g: 0, b: 0, a: 0.6 },
    offsetX: 0,
    offsetY: -2,
    blur: 6,
  },
  background: { enabled: false, color: { r: 0, g: 0, b: 0, a: 0.6 } },
  border: { enabled: false, color: { r: 0, g: 0, b: 0, a: 1 } },
};

export function isProtected(clip: Clip, field: ProtectedField, respect: boolean): boolean {
  return respect && (clip.protectedFields ?? []).includes(field);
}

export function mergeAutomaticTextStyle(
  current: TextStyle | undefined,
  incoming: TextStyle,
  protectedFields: readonly ProtectedField[] | undefined,
): TextStyle {
  const locked = new Set(protectedFields ?? []);
  const style: TextStyle = current ? structuredClone(current) : structuredClone(DEFAULT_STYLE);
  if (!locked.has("textFontName")) style.fontName = incoming.fontName;
  if (!locked.has("textFontSize")) style.fontSize = incoming.fontSize;
  if (!locked.has("textFontScale")) style.fontScale = incoming.fontScale;
  if (!locked.has("textColor")) style.color = structuredClone(incoming.color);
  if (!locked.has("textAlignment")) style.alignment = incoming.alignment;
  if (!locked.has("textShadow")) style.shadow = structuredClone(incoming.shadow);
  if (!locked.has("textBackground")) style.background = structuredClone(incoming.background);
  if (!locked.has("textBorder")) style.border = structuredClone(incoming.border);
  return style;
}

export function mergeTextStylePatch(
  current: TextStyle | undefined,
  patch: TextStylePatch,
  protectedFields: readonly ProtectedField[] | undefined,
  respect: boolean,
): TextStyle {
  const locked = new Set(respect ? protectedFields ?? [] : []);
  const style: TextStyle = current ? structuredClone(current) : structuredClone(DEFAULT_STYLE);
  if (patch.fontName !== undefined && !locked.has("textFontName")) style.fontName = patch.fontName;
  if (patch.fontSize !== undefined && !locked.has("textFontSize")) style.fontSize = patch.fontSize;
  if (patch.fontScale !== undefined && !locked.has("textFontScale")) style.fontScale = patch.fontScale;
  if (patch.color !== undefined && !locked.has("textColor")) style.color = structuredClone(patch.color);
  if (patch.alignment !== undefined && !locked.has("textAlignment")) style.alignment = patch.alignment;
  if (patch.shadow !== undefined && !locked.has("textShadow")) style.shadow = structuredClone(patch.shadow);
  if (patch.background !== undefined && !locked.has("textBackground")) {
    style.background = structuredClone(patch.background);
  }
  if (patch.border !== undefined && !locked.has("textBorder")) style.border = structuredClone(patch.border);
  return style;
}

export function mergeProtectedTransform(
  current: Transform,
  incoming: Transform,
  protectedFields: readonly ProtectedField[] | undefined,
): Transform {
  const locked = new Set(protectedFields ?? []);
  return {
    centerX: locked.has("transformPosition") ? current.centerX : incoming.centerX,
    centerY: locked.has("transformPosition") ? current.centerY : incoming.centerY,
    width: locked.has("transformScale") ? current.width : incoming.width,
    height: locked.has("transformScale") ? current.height : incoming.height,
    rotation: locked.has("transformRotation") ? current.rotation : incoming.rotation,
    flipHorizontal: incoming.flipHorizontal,
    flipVertical: incoming.flipVertical,
  };
}

/** Frames for one user-selected asset. Images and unknown durations use 5 seconds.
 *  The conversion truncates toward zero. This is a placement rule, not an analysis. */
export function roughCutDurationFrames(
  mediaType: Clip["mediaType"],
  durationSeconds: number,
  fps: number,
): number {
  const seconds = mediaType === "image" || !(durationSeconds > 0) ? 5 : durationSeconds;
  const frames = Math.trunc(seconds * Math.max(1, fps));
  return Math.max(1, frames);
}
