// Native-shape diagrams. Everything is real shapes + real text (never a flattened
// image) so the diagrams stay editable in Canva and keyword-scannable by an ATS.

import { C, FONT, card } from "./theme.mjs";

const DOWN_ARROW = { color: C.faint, width: 1.25, endArrowType: "triangle" };

/** Vertical connector between two stacked bands. */
function downArrow(slide, pptx, x, y, h, color = C.faint) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w: 0,
    h,
    line: { ...DOWN_ARROW, color },
  });
}

/** Horizontal connector. */
function rightArrow(slide, pptx, x, y, w, color = C.faint) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    h: 0,
    line: { color, width: 1.25, endArrowType: "triangle" },
  });
}

/** A layer band: upright label rail on the left, content area to its right. */
function band(slide, pptx, { x, y, w, h, label, accent, wash = C.wash }) {
  card(slide, pptx, { x, y, w, h, fill: wash, border: C.line });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.02,
    y: y + 0.06,
    w: 0.05,
    h: h - 0.12,
    fill: { color: accent },
    line: { type: "none" },
  });
  slide.addText(label, {
    x: x + 0.16,
    y,
    w: 1.16,
    h,
    fontFace: FONT,
    fontSize: 7.5,
    bold: true,
    color: accent,
    charSpacing: 0.5,
    valign: "middle",
    align: "left",
    margin: 0,
  });
}

/** Small tile inside a band. */
function tile(slide, pptx, { x, y, w, h, title, sub, accent: _accent, fill = C.white, titleColor = C.ink }) {
  card(slide, pptx, { x, y, w, h, fill, border: C.line });
  // Split the height proportionally so the title and sub can never collide,
  // whatever height the caller allocates.
  const titleY = y + h * 0.06;
  const titleH = h * 0.4;
  const subY = y + h * 0.5;
  const subH = h * 0.46;
  slide.addText(title, {
    x: x + 0.08,
    y: sub ? titleY : y,
    w: w - 0.16,
    h: sub ? titleH : h,
    fontFace: FONT,
    fontSize: 8.5,
    bold: true,
    color: titleColor,
    valign: "middle",
    align: "center",
    margin: 0,
    fit: "shrink",
  });
  if (sub) {
    slide.addText(sub, {
      x: x + 0.07,
      y: subY,
      w: w - 0.14,
      h: subH,
      fontFace: FONT,
      fontSize: 6.8,
      color: C.muted,
      align: "center",
      valign: "middle",
      margin: 0,
      fit: "shrink",
    });
  }
}

/**
 * Slide 2 — the MAIN architecture diagram.
 * The first impression has to land here, so this shows users, clients, the engine,
 * data, AI fallback and the verification loop in one read.
 */
export function drawArchitecture(slide, pptx, { x, y, w, h, accent }) {
  slide.addText("SYSTEM ARCHITECTURE", {
    x,
    y,
    w,
    h: 0.22,
    fontFace: FONT,
    fontSize: 8,
    bold: true,
    color: accent,
    charSpacing: 0.8,
    margin: 0,
    valign: "middle",
  });

  const GAP = 0.14;
  let cy = y + 0.28;
  const innerX = (bx) => bx + 1.42;
  const innerW = (bw) => bw - 1.6;

  // ── Band 1: the four user roles ────────────────────────────────────────────
  const h1 = 0.58;
  band(slide, pptx, { x, y: cy, w, h: h1, label: "USERS", accent });
  const roles = [
    ["Student", "Ayush / BAMS"],
    ["Industry", "hospitals, pharma"],
    ["Academician", "faculty"],
    ["Institution", "placement cell"],
  ];
  const rw = (innerW(w) - 3 * 0.1) / 4;
  roles.forEach((r, i) => {
    tile(slide, pptx, {
      x: innerX(x) + i * (rw + 0.1),
      y: cy + 0.09,
      w: rw,
      h: h1 - 0.18,
      title: r[0],
      sub: r[1],
      accent,
    });
  });
  cy += h1;

  // ── Band 2: client ─────────────────────────────────────────────────────────
  downArrow(slide, pptx, x + w / 2, cy + 0.01, GAP - 0.03, accent);
  const h2 = 0.48;
  const by2 = cy + GAP;
  band(slide, pptx, { x, y: by2, w, h: h2, label: "CLIENT", accent });
  tile(slide, pptx, {
    x: innerX(x),
    y: by2 + 0.07,
    w: (innerW(w) - 0.1) / 2,
    h: h2 - 0.14,
    title: "Web PWA",
    sub: "installable, mobile + desktop",
    accent,
  });
  tile(slide, pptx, {
    x: innerX(x) + (innerW(w) - 0.1) / 2 + 0.1,
    y: by2 + 0.07,
    w: (innerW(w) - 0.1) / 2,
    h: h2 - 0.14,
    title: "Offline service worker",
    sub: "cached, works with no network",
    accent,
  });
  cy = by2 + h2;

  // ── Band 3: the engine (the heart) ─────────────────────────────────────────
  downArrow(slide, pptx, x + w / 2, cy + 0.01, GAP - 0.03, accent);
  const h3 = 0.92;
  const by3 = cy + GAP;
  band(slide, pptx, { x, y: by3, w, h: h3, label: "SKILL ENGINE", accent, wash: C.white });
  const caps = [
    "Skill taxonomy",
    "Assessment",
    "Gap analysis",
    "Explainable matching",
    "Evidence verification",
    "Cohort analytics",
  ];
  const cw = (innerW(w) - 2 * 0.1) / 3;
  caps.forEach((cap, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cxp = innerX(x) + col * (cw + 0.1);
    const cyp = by3 + 0.08 + row * 0.4;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cxp,
      y: cyp,
      w: cw,
      h: 0.33,
      rectRadius: 0.05,
      fill: { color: accent },
      line: { type: "none" },
    });
    slide.addText(cap, {
      x: cxp,
      y: cyp,
      w: cw,
      h: 0.33,
      fontFace: FONT,
      fontSize: 7.6,
      bold: true,
      color: C.white,
      align: "center",
      valign: "middle",
      margin: 0,
    });
  });
  cy = by3 + h3;

  // ── Band 4: data ───────────────────────────────────────────────────────────
  downArrow(slide, pptx, x + w / 2, cy + 0.01, GAP - 0.03, accent);
  const h4 = 0.52;
  const by4 = cy + GAP;
  band(slide, pptx, { x, y: by4, w, h: h4, label: "DATA", accent });
  const bw = (innerW(w) - 0.1) / 2;
  tile(slide, pptx, {
    x: innerX(x),
    y: by4 + 0.07,
    w: bw,
    h: h4 - 0.14,
    title: "LocalStorage — source of truth",
    sub: "every screen renders from here",
    accent,
  });
  tile(slide, pptx, {
    x: innerX(x) + bw + 0.1,
    y: by4 + 0.07,
    w: bw,
    h: h4 - 0.14,
    title: "Supabase Postgres — mirror",
    sub: "6 tables, anon REST, best-effort",
    accent,
  });
  cy = by4 + h4;

  // ── Band 5: AI (optional) + deploy ─────────────────────────────────────────
  downArrow(slide, pptx, x + w / 2, cy + 0.01, GAP - 0.03, accent);
  const h5 = 0.52;
  const by5 = cy + GAP;
  band(slide, pptx, { x, y: by5, w, h: h5, label: "AI + DEPLOY", accent });
  tile(slide, pptx, {
    x: innerX(x),
    y: by5 + 0.07,
    w: bw,
    h: h5 - 0.14,
    title: "Groq / Gemini — optional",
    sub: "deterministic fallback if no key",
    accent,
  });
  tile(slide, pptx, {
    x: innerX(x) + bw + 0.1,
    y: by5 + 0.07,
    w: bw,
    h: h5 - 0.14,
    title: "Static deploy, free tier",
    sub: "no server to operate",
    accent,
  });
  cy = by5 + h5;

  // ── Verification loop strip (the differentiator) ───────────────────────────
  const vy = cy + GAP;
  const vh = y + h - vy;
  if (vh > 0.3) {
    card(slide, pptx, { x, y: vy, w, h: vh, fill: C.greenWash, border: C.green });
    slide.addText(
      [
        { text: "VERIFICATION LOOP   ", options: { bold: true, color: C.green, fontSize: 7.5, charSpacing: 0.5 } },
        {
          text: "course + project + evidence URL → verified  ·  self-typed tick → claimed  ·  QR passport at /verify/:code",
          options: { color: C.ink, fontSize: 7.5 },
        },
      ],
      {
        x: x + 0.16,
        y: vy,
        w: w - 0.32,
        h: vh,
        fontFace: FONT,
        valign: "middle",
        margin: 0,
      },
    );
  }
}

/**
 * Slide 3 — the process pipeline as an 8-step chevron ribbon.
 */
export function drawPipeline(slide, pptx, { x, y, w, accent }) {
  const steps = [
    ["01", "Resume in", "paste text or PDF"],
    ["02", "Readiness score", "5 weighted dimensions"],
    ["03", "Role quiz", "10 questions, 0-100"],
    ["04", "Gap quests", "course + project"],
    ["05", "Evidence", "proof URL required"],
    ["06", "MAIN score", "rank band assigned"],
    ["07", "Eligibility gate", "industry sets the bar"],
    ["08", "Track + verify", "pipeline, QR passport"],
  ];
  const h = 1.02;
  const gap = 0.06;
  const cw = (w - gap * (steps.length - 1)) / steps.length;

  steps.forEach((s, i) => {
    const cxp = x + i * (cw + gap);
    card(slide, pptx, { x: cxp, y, w: cw, h, fill: i % 2 === 0 ? C.white : C.wash, border: C.line });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cxp,
      y,
      w: cw,
      h: 0.2,
      rectRadius: 0.04,
      fill: { color: accent },
      line: { type: "none" },
    });
    slide.addText(s[0], {
      x: cxp,
      y,
      w: cw,
      h: 0.2,
      fontFace: FONT,
      fontSize: 7,
      bold: true,
      color: C.white,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    slide.addText(s[1], {
      x: cxp + 0.05,
      y: y + 0.24,
      w: cw - 0.1,
      h: 0.28,
      fontFace: FONT,
      fontSize: 8.4,
      bold: true,
      color: C.ink,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    slide.addText(s[2], {
      x: cxp + 0.04,
      y: y + 0.55,
      w: cw - 0.08,
      h: 0.4,
      fontFace: FONT,
      fontSize: 6.6,
      color: C.muted,
      align: "center",
      valign: "top",
      margin: 0,
    });

    if (i < steps.length - 1) {
      slide.addShape(pptx.ShapeType.line, {
        x: cxp + cw,
        y: y + h / 2,
        w: gap,
        h: 0,
        line: { color: accent, width: 1, endArrowType: "triangle" },
      });
    }
  });
}

/**
 * The published scoring model, drawn as bars. Explainability is the USP, so the
 * weights are shown rather than described.
 */
export function drawWeights(slide, pptx, { x, y, w, accent, title, rows }) {
  slide.addText(title, {
    x,
    y,
    w,
    h: 0.2,
    fontFace: FONT,
    fontSize: 8,
    bold: true,
    color: accent,
    charSpacing: 0.8,
    margin: 0,
    valign: "middle",
  });
  const rowH = 0.26;
  rows.forEach((r, i) => {
    const ry = y + 0.26 + i * rowH;
    slide.addText(r.label, {
      x,
      y: ry,
      w: w * 0.44,
      h: rowH - 0.05,
      fontFace: FONT,
      fontSize: 7.4,
      color: C.ink,
      valign: "middle",
      margin: 0,
    });
    const barX = x + w * 0.45;
    const barW = w * 0.42;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: barX,
      y: ry + 0.055,
      w: barW,
      h: 0.115,
      rectRadius: 0.02,
      fill: { color: C.line },
      line: { type: "none" },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: barX,
      y: ry + 0.055,
      w: Math.max(0.08, barW * r.value),
      h: 0.115,
      rectRadius: 0.02,
      fill: { color: accent },
      line: { type: "none" },
    });
    slide.addText(r.display, {
      x: barX + barW + 0.06,
      y: ry,
      w: w * 0.13,
      h: rowH - 0.05,
      fontFace: FONT,
      fontSize: 7.4,
      bold: true,
      color: accent,
      valign: "middle",
      align: "right",
      margin: 0,
    });
  });
}

/**
 * Slide 6 — a horizontal status rail: what is already done vs in progress.
 */
export function drawProgress(slide, pptx, { x, y, w, accent }) {
  const steps = [
    ["Problem statement", "understood"],
    ["Requirement", "analysis done"],
    ["Existing vs proposed", "studied"],
    ["Idea deck", "prepared"],
    ["Prototype", "built and live"],
  ];
  const gap = 0.12;
  const cw = (w - gap * (steps.length - 1)) / steps.length;
  const h = 0.5;

  steps.forEach((s, i) => {
    const cxp = x + i * (cw + gap);
    const done = i < steps.length - 1;
    card(slide, pptx, { x: cxp, y, w: cw, h, fill: done ? C.greenWash : C.saffronWash, border: done ? C.green : C.saffron });
    slide.addText(
      [
        { text: done ? "OK  " : ">>  ", options: { bold: true, color: done ? C.green : C.saffron, fontSize: 7 } },
        { text: s[0], options: { bold: true, color: C.ink, fontSize: 7 } },
        { text: `\n${s[1]}`, options: { color: C.muted, fontSize: 6.6 } },
      ],
      {
        x: cxp + 0.08,
        y,
        w: cw - 0.16,
        h,
        fontFace: FONT,
        valign: "middle",
        margin: 0,
        lineSpacingMultiple: 1.1,
      },
    );
    if (i < steps.length - 1) {
      slide.addShape(pptx.ShapeType.line, {
        x: cxp + cw,
        y: y + h / 2,
        w: gap,
        h: 0,
        line: { color: accent, width: 1, endArrowType: "triangle" },
      });
    }
  });
}

/**
 * Compact horizontal version of the published weights, for slides where the
 * vertical bar chart would not fit.
 */
export function drawWeightsStrip(slide, pptx, { x, y, w, accent, title, rows }) {
  slide.addText(title, {
    x,
    y,
    w,
    h: 0.2,
    fontFace: FONT,
    fontSize: 8,
    bold: true,
    color: accent,
    charSpacing: 0.8,
    margin: 0,
    valign: "middle",
  });
  const gap = 0.1;
  const tw = (w - gap * (rows.length - 1)) / rows.length;
  const th = 0.58;
  rows.forEach((r, i) => {
    const tx = x + i * (tw + gap);
    card(slide, pptx, { x: tx, y: y + 0.26, w: tw, h: th });
    slide.addText(r.display, {
      x: tx,
      y: y + 0.27,
      w: tw,
      h: 0.3,
      fontFace: FONT,
      fontSize: 14,
      bold: true,
      color: accent,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    slide.addText(r.label, {
      x: tx + 0.04,
      y: y + 0.56,
      w: tw - 0.08,
      h: 0.26,
      fontFace: FONT,
      fontSize: 6,
      color: C.muted,
      align: "center",
      valign: "top",
      margin: 0,
      fit: "shrink",
    });
  });
}

/**
 * Slide 4 — business model as three tiers, with the cost/revenue path under each.
 */
export function drawBusinessModel(slide, pptx, { x, y, w, accent }) {
  const tiers = [
    {
      name: "Students + Institutions",
      price: "Free",
      note: "Ministry / institution deployment. No student ever pays, and no account is needed to start.",
    },
    {
      name: "Industry + Hospitals",
      price: "Premium",
      note: "Shortlisting analytics and program promotion. They fund the platform; students never do.",
    },
    {
      name: "Certification providers",
      price: "Revenue share",
      note: "Course and certification referrals attached to a diagnosed gap, not to a banner ad.",
    },
  ];
  const gap = 0.16;
  const cw = (w - gap * 2) / 3;
  const h = 1.24;

  tiers.forEach((t, i) => {
    const cxp = x + i * (cw + gap);
    card(slide, pptx, { x: cxp, y, w: cw, h, fill: C.white, border: C.line });
    slide.addShape(pptx.ShapeType.rect, {
      x: cxp,
      y,
      w: cw,
      h: 0.055,
      fill: { color: accent },
      line: { type: "none" },
    });
    slide.addText(t.name, {
      x: cxp + 0.14,
      y: y + 0.13,
      w: cw - 0.28,
      h: 0.22,
      fontFace: FONT,
      fontSize: 8.6,
      bold: true,
      color: C.ink,
      margin: 0,
      valign: "middle",
    });
    slide.addText(t.price, {
      x: cxp + 0.14,
      y: y + 0.38,
      w: cw - 0.28,
      h: 0.3,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: accent,
      margin: 0,
      valign: "middle",
    });
    slide.addText(t.note, {
      x: cxp + 0.14,
      y: y + 0.72,
      w: cw - 0.28,
      h: h - 0.86,
      fontFace: FONT,
      fontSize: 7,
      color: C.muted,
      margin: 0,
      valign: "top",
      lineSpacingMultiple: 1.1,
    });
  });
}

export { rightArrow, downArrow, band, tile };
