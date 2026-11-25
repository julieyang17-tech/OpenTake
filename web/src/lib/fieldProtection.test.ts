import { describe, expect, it } from "vitest";
import {
  mergeAutomaticTextStyle,
  mergeTextStylePatch,
  roughCutDurationFrames,
} from "./fieldProtection";
import type { TextStyle } from "./types";

const manual: TextStyle = {
  fontName: "Songti",
  fontSize: 80,
  fontScale: 1.2,
  color: { r: 0.2, g: 0.3, b: 0.4, a: 1 },
  alignment: "right",
  shadow: { enabled: false, color: { r: 0, g: 0, b: 0, a: 1 }, offsetX: 1, offsetY: 1, blur: 0 },
  background: { enabled: true, color: { r: 0, g: 0, b: 0, a: 0.4 } },
  border: { enabled: false, color: { r: 1, g: 1, b: 1, a: 1 } },
};

describe("field protection merge", () => {
  it("changes only the patched font size", () => {
    const next = mergeTextStylePatch(manual, { fontSize: 42 }, ["textFontSize"], false);
    expect(next.fontSize).toBe(42);
    expect(next.fontName).toBe("Songti");
    expect(next.alignment).toBe("right");
    expect(next.color).toEqual(manual.color);
    expect(next.fontScale).toBe(1.2);
  });

  it("skips locked fields when an automatic style arrives", () => {
    const incoming: TextStyle = {
      ...manual,
      fontName: "Helvetica",
      fontSize: 12,
      color: { r: 1, g: 0, b: 0, a: 1 },
      alignment: "center",
    };
    const next = mergeAutomaticTextStyle(manual, incoming, ["textFontSize", "textColor"]);
    expect(next.fontSize).toBe(80);
    expect(next.color).toEqual(manual.color);
    expect(next.fontName).toBe("Helvetica");
    expect(next.alignment).toBe("center");
  });

  it("uses a five-second rule for stills and keeps the caller's order units", () => {
    expect(roughCutDurationFrames("image", 0, 30)).toBe(150);
    expect(roughCutDurationFrames("video", 1.9, 30)).toBe(57);
  });
});
