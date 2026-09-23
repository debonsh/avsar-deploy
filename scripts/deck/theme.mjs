// Design tokens for the SIH 2026 idea-submission deck.
// 16:9, one accent colour per slide, replicating the official SIH template chrome.

export const SLIDE = { w: 13.333, h: 7.5 };

// Official SIH palette: saffron + India green on white, navy for authority.
export const C = {
  saffron: "FF7A1A",
  saffronWash: "FFF1E6",
  green: "138808",
  greenWash: "E9F5E9",
  navy: "0B2A4A",
  navyWash: "EAF0F6",
  ink: "111827",
  muted: "5B6472",
  faint: "8A93A0",
  line: "E3E7EC",
  wash: "F7F8FA",
  white: "FFFFFF",
  // Title-slide field styling, taken from the user's own title slide.
  labelRed: "B02418",
  deepNavy: "1B3A5C",
};

export const FONT = "Inter";

// Layout grid, measured off the official SIH 2026 template exports at 98.5 px/in.
// The template has no header rule and no footer text: the chrome is a wordmark, a
// section pill, the SIH lockup, a cityscape watermark and a solid accent bar.
export const L = {
  marginX: 0.42,

  // Header band
  wordmark: { x: 0.42, y: 0.19, w: 2.05, h: 0.475 },
  pill: { y: 0.15, h: 0.58 },
  sih: { right: 12.94, textW: 1.45, markH: 0.62, gap: 0.08, y: 0.15 },

  // Bottom chrome
  cityY: 4.5,
  cityH: 2.82,
  barY: 7.32,
  barH: 0.09,

  // Content area. The cityscape is a light watermark, so opaque cards may sit over
  // it; bare text is kept above the densest part of the silhouette.
  bodyTop: 1.02,
  bodyBottom: 6.42,
};

export const CONTENT_W = SLIDE.w - L.marginX * 2; // 12.493

// Measured pill widths, so the pill hugs its label exactly like the template.
export const PILL_W = {
  "SMART INDIA HACKATHON 2026": 7.65,
  "TITLE PAGE": 2.3,
  "IDEA TITLE": 2.28,
  "TECHNICAL APPROACH": 4.17,
  "FEASIBILITY AND VIABILITY": 4.91,
  "IMPACT AND BENEFITS": 4.34,
  "RESEARCH AND REFERENCES": 4.6,
};

// Accent per slide, read off the template: title navy, idea green, technical navy,
// feasibility green, impact navy, references navy.
export const ACCENTS = [C.navy, C.green, C.navy, C.green, C.navy, C.navy];

export const TYPE = {
  pill: 15,
  slideTitle: 26,
  h2: 13,
  body: 10.5,
  small: 9,
  tiny: 7.5,
  statBig: 34,
  statLabel: 9,
};

/** Rounded card: white fill, hairline border. */
export function card(slide, pptx, { x, y, w, h, fill = C.white, border = C.line, radius = 0.06 }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: radius,
    fill: { color: fill },
    line: border ? { color: border, width: 0.75 } : { type: "none" },
  });
}

/** Filled accent chip with a label. */
export function chip(slide, pptx, { x, y, w, h, label, color, size = TYPE.tiny, textColor = C.white }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.04,
    fill: { color },
    line: { type: "none" },
  });
  slide.addText(label.toUpperCase(), {
    x,
    y,
    w,
    h,
    align: "center",
    valign: "middle",
    fontFace: FONT,
    fontSize: size,
    bold: true,
    color: textColor,
    charSpacing: 0.6,
    margin: 0,
  });
}

/** Section pill, centred in the header band, sized to hug its label. */
export function sectionPill(slide, pptx, { label, color }) {
  const w = PILL_W[label] ?? Math.max(2.3, 0.38 + label.length * 0.19);
  const { y, h } = L.pill;
  const x = (SLIDE.w - w) / 2;
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.5,
    fill: { color },
    line: { type: "none" },
  });
  slide.addText(label, {
    x,
    y,
    w,
    h,
    align: "center",
    valign: "middle",
    fontFace: FONT,
    fontSize: 17,
    bold: true,
    color: C.white,
    charSpacing: 1,
    margin: 0,
  });
}

/** Thin rule. */
export function rule(slide, pptx, { x, y, w, color = C.line, width = 0.75 }) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    h: 0,
    line: { color, width },
  });
}

/** Small caption used under screenshots and diagrams. */
export function caption(slide, { x, y, w, text, color = C.faint, size = TYPE.tiny, align = "left" }) {
  slide.addText(text, {
    x,
    y,
    w,
    h: 0.18,
    fontFace: FONT,
    fontSize: size,
    color,
    align,
    valign: "middle",
    margin: 0,
  });
}

/** Bordered metric tile. Value and label split the height so they never collide. */
export function metric(slide, pptx, { x, y, w, h, value, label, color }) {
  card(slide, pptx, { x, y, w, h });
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 0.045,
    h,
    fill: { color },
    line: { type: "none" },
  });
  slide.addText(value, {
    x: x + 0.16,
    y: y + h * 0.05,
    w: w - 0.26,
    h: h * 0.53,
    fontFace: FONT,
    fontSize: TYPE.statBig,
    bold: true,
    color,
    margin: 0,
    valign: "middle",
  });
  slide.addText(label, {
    x: x + 0.16,
    y: y + h * 0.6,
    w: w - 0.26,
    h: h * 0.36,
    fontFace: FONT,
    fontSize: TYPE.statLabel,
    color: C.muted,
    margin: 0,
    valign: "top",
  });
}

/**
 * Bulleted body list. Each item is either a plain string or `{ b, t }`, where
 * `b` is a bold lead-in and `t` the remaining text. Keeping one shape avoids the
 * run/array mismatch that silently renders as "[object Object]".
 */
export function bullets(slide, { x, y, w, h, items, size = TYPE.body, color = C.ink, lineSpacing = 1.16 }) {
  const runs = [];
  items.forEach((item, i) => {
    const isLast = i === items.length - 1;
    if (typeof item === "string") {
      runs.push({
        text: item,
        options: { bullet: { code: "25AA" }, breakLine: !isLast, color },
      });
      return;
    }
    runs.push({
      text: item.b,
      options: { bold: true, bullet: { code: "25AA" }, color },
    });
    runs.push({
      text: ` ${item.t}`,
      options: { bold: false, breakLine: !isLast, color },
    });
  });
  slide.addText(runs, {
    x,
    y,
    w,
    h,
    fontFace: FONT,
    fontSize: size,
    color,
    lineSpacingMultiple: lineSpacing,
    paraSpaceAfter: 6,
    valign: "top",
    margin: 0,
  });
}
