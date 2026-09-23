// Builds the SIH 2026 six-slide idea-submission deck.
//
//   node scripts/deck/build-deck.mjs            # draft: warns about unresolved fields
//   node scripts/deck/build-deck.mjs --strict   # fails on any unresolved field
//
// Output: <repo>/PPT/build/AVSAR_SIH2026_Zencoderss_6slide.pptx
//
// Design rules enforced here, per the official template and the SIH winner guidance:
//   - exactly 6 slides, fixed section names
//   - the official SIH 2026 lockup, top-right, on every slide
//   - one accent colour per slide, no paragraphs, bold keywords
//   - diagrams are native shapes with real text, never flattened images
//   - every image carries alt text, and PS keywords live in real text for ATS scans

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";

import {
  SLIDE,
  C,
  FONT,
  L,
  CONTENT_W,
  ACCENTS,
  card,
  chip,
  sectionPill,
  rule,
  metric,
  bullets,
} from "./theme.mjs";
import {
  drawArchitecture,
  drawPipeline,
  drawProgress,
  drawBusinessModel,
  drawWeightsStrip,
} from "./diagrams.mjs";
import {
  META,
  SLIDE_1,
  SLIDE_2,
  SLIDE_3,
  SLIDE_4,
  SLIDE_5,
  SLIDE_6,
  validate,
} from "./content.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(HERE, "..", "..");
const REPO_ROOT = join(APP_ROOT, "..");
const PPT_DIR = join(REPO_ROOT, "PPT");
const BUILD_DIR = join(PPT_DIR, "build");
const SHOTS_DIR = join(BUILD_DIR, "shots");
const MARK = join(BUILD_DIR, "assets", "sih-mark.png");
const CITYSCAPE_GREEN = join(BUILD_DIR, "assets", "cityscape-green.png");
const CITYSCAPE_GREY = join(BUILD_DIR, "assets", "cityscape-grey.png");
const WORDMARK = join(BUILD_DIR, "assets", "zencoderss-wordmark.png");
const AVSAR_LOGO = join(BUILD_DIR, "assets", "avsar-logo.png");
// Aspects of the cropped/rendered assets, emitted by prepare-logo.mjs / prepare-assets.mjs.
const MARK_W = 563;
const MARK_H = 633;
const CITY_W = 1320;
const CITY_H = 279;
const WORDMARK_W = 216;
const WORDMARK_H = 50;
const AVSAR_W = 720;
const AVSAR_H = 180;

const STRICT = process.argv.includes("--strict");

const SHOT_FILES = {
  resume: "01-resume.png",
  quests: "02-quests.png",
  jobs: "03-jobs.png",
  industry: "04-industry.png",
  institute: "05-institute.png",
  portfolio: "06-portfolio.png",
  landing: "07-landing.png",
  home: "08-home.png",
  journey: "09-journey.png",
};

const SHOT_ALT = {
  resume: "Application screenshot: readiness score with a five-dimension breakdown and traced fixes that raise the score",
  quests: "Application screenshot: skill gap quests showing a course, a mini project and a proof link per gap",
  jobs: "Application screenshot: internship and job feed with explainable fit score and eligibility chips",
  industry: "Application screenshot: industry role posting form with a ranked, explainable shortlist of candidates",
  institute: "Application screenshot: institute dashboard with cohort bands and live demand versus cohort supply",
  portfolio: "Application screenshot: student digital portfolio with verified versus claimed skills and a QR credential",
  landing: "Application screenshot: Avsar front door for Ayush students, with the rotatory internship tracker and the Shishiksha orientation checklist",
  home: "Application screenshot: student home dashboard summarising readiness, recurring skill gaps and next actions",
  journey: "Application screenshot: the skill journey timeline from assessment through to a verified portfolio",
};

// ── Chrome ───────────────────────────────────────────────────────────────────

/**
 * The template chrome, drawn BEFORE the slide content so the cityscape sits behind it.
 * Matches the official SIH 2026 template: Zencoderss wordmark top-left, section pill
 * centred, SIH lockup top-right, tinted cityscape watermark, solid accent bar.
 */
function chrome(slide, pptx, { pill, accent, green }) {
  // Cityscape watermark, tinted to the slide accent.
  const cityPath = green ? CITYSCAPE_GREEN : CITYSCAPE_GREY;
  if (existsSync(cityPath)) {
    const h = (CITY_H / CITY_W) * SLIDE.w;
    slide.addImage({
      path: cityPath,
      x: 0,
      y: L.barY - h,
      w: SLIDE.w,
      h,
      altText:
        "Cityscape silhouette: students, colleges, hospitals, offices and a growth chart, representing the academia and industry the portal connects",
    });
  }

  // Solid accent bar, full bleed.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: L.barY,
    w: SLIDE.w,
    h: L.barH,
    fill: { color: accent },
    line: { type: "none" },
  });

  // Team wordmark, top-left.
  if (existsSync(WORDMARK)) {
    const w = (WORDMARK_W / WORDMARK_H) * L.wordmark.h;
    slide.addImage({
      path: WORDMARK,
      x: L.wordmark.x,
      y: L.wordmark.y,
      w,
      h: L.wordmark.h,
      altText: "Team Zencoderss wordmark",
    });
  }

  sectionPill(slide, pptx, { label: pill, color: accent });

  // Official SIH 2026 lockup, top-right: bulb mark then the wording as real text.
  const { right, textW, markH, gap, y } = L.sih;
  const markW = (MARK_W / MARK_H) * markH;
  const textX = right - textW;
  slide.addText(
    [
      { text: "SMART INDIA HACKATHON", options: { bold: true, fontSize: 9, color: C.navy, breakLine: true } },
      { text: "2026", options: { bold: true, fontSize: 9, color: C.navy } },
    ],
    {
      x: textX,
      y: y + 0.06,
      w: textW,
      h: 0.44,
      fontFace: FONT,
      align: "right",
      valign: "middle",
      margin: 0,
      lineSpacingMultiple: 1.1,
    },
  );
  if (existsSync(MARK)) {
    slide.addImage({
      path: MARK,
      x: textX - gap - markW,
      y: y + 0.02,
      w: markW,
      h: markH,
      altText: "Smart India Hackathon 2026 official logo",
    });
  }
}

// The template has no footer text, so there is no footer() — the accent bar and the
// cityscape watermark are the footer. PS vocabulary lives in the slide bodies and in
// the image alt text, which is what a keyword scan reads.

function hdr(slide, { x, y, w, text, color }) {
  slide.addText(text.toUpperCase(), {
    x,
    y,
    w,
    h: 0.2,
    fontFace: FONT,
    fontSize: 8,
    bold: true,
    color,
    charSpacing: 0.8,
    margin: 0,
    valign: "middle",
  });
}

/** Screenshot box, crop-filled. Falls back to a labelled placeholder if not captured. */
function shot(slide, pptx, { key, x, y, w, h, accent: _accent, caption: cap, radius = 0.05 }) {
  const file = join(SHOTS_DIR, SHOT_FILES[key]);
  const present = existsSync(file);
  card(slide, pptx, { x, y, w, h, fill: present ? C.white : C.wash, border: C.line, radius });
  if (present) {
    slide.addImage({
      path: file,
      x: x + 0.03,
      y: y + 0.03,
      w: w - 0.06,
      h: h - 0.06,
      sizing: { type: "cover", w: w - 0.06, h: h - 0.06 },
      altText: SHOT_ALT[key],
    });
  } else {
    slide.addText(`screenshot pending\n${SHOT_FILES[key]}`, {
      x,
      y,
      w,
      h,
      fontFace: FONT,
      fontSize: 7,
      color: C.faint,
      align: "center",
      valign: "middle",
      margin: 0,
    });
  }
  if (cap) {
    slide.addText(cap, {
      x,
      y: y + h + 0.03,
      w,
      h: 0.18,
      fontFace: FONT,
      fontSize: 6.6,
      color: C.muted,
      align: "center",
      margin: 0,
      valign: "middle",
    });
  }
}

// ── Slides ───────────────────────────────────────────────────────────────────

function slide1(slide, pptx, accent) {
  // Green Avsar logo, centred, above the portal field block.
  if (existsSync(AVSAR_LOGO)) {
    const w = 3.5;
    const h = w * (AVSAR_H / AVSAR_W);
    slide.addImage({
      path: AVSAR_LOGO,
      x: (SLIDE.w - w) / 2,
      y: 1.08,
      w,
      h,
      altText:
        "Avsar logo: a green mark of ascending bars reaching a star, with the strapline Skills Today, Opportunities Tomorrow",
    });
  }

  // Dashed portal-field card, mirroring the user's title slide.
  const cardX = 0.72;
  const cardW = SLIDE.w - cardX * 2;
  const cardY = 2.28;
  const cardH = 3.72;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: cardX,
    y: cardY,
    w: cardW,
    h: cardH,
    rectRadius: 0.06,
    fill: { color: C.wash },
    line: { type: "dash", color: accent, width: 1.5 },
  });

  // `Label:- Value`, bold throughout, which is how their title slide reads.
  // An unresolved field renders as a muted note rather than a mustache token, so the
  // deck never reads as broken — but the build still warns about it.
  const field = (label, v, note = "") => {
    const isPlaceholder = /\{\{[^}]+\}\}/.test(v);
    return [
      { text: `${label}:- `, options: { color: C.labelRed, bold: true } },
      {
        text: isPlaceholder ? note : v,
        options: isPlaceholder
          ? { italic: true, color: C.faint, bold: false, breakLine: true }
          : { color: C.deepNavy, bold: true, breakLine: true },
      },
    ];
  };

  const runs = [
    ...field("Problem Statement ID", META.psId),
    ...field("Problem Statement Title", META.psTitle),
    ...field("Theme", META.theme),
    ...field("PS Category", META.category),
    ...field("Team ID", META.teamId, "to be filled from the portal"),
    ...field("Team Name", META.team),
    ...field("Organisation", META.org),
  ];

  slide.addText(runs, {
    x: cardX + 0.34,
    y: cardY + 0.3,
    w: cardW - 0.68,
    h: cardH - 0.6,
    fontFace: FONT,
    fontSize: 13.5,
    color: C.deepNavy,
    lineSpacingMultiple: 2.05,
    valign: "top",
    margin: 0,
  });
}

function slide2(slide, pptx, accent) {
  const leftW = 4.82;
  const lx = L.marginX;
  const rx = L.marginX + leftW + 0.24;
  const rw = CONTENT_W - leftW - 0.24;

  chip(slide, pptx, { x: lx, y: 1.02, w: 1.85, h: 0.26, label: SLIDE_2.chip, color: accent });

  slide.addText(SLIDE_2.oneLiner, {
    x: lx,
    y: 1.38,
    w: leftW,
    h: 0.96,
    fontFace: FONT,
    fontSize: 10,
    color: C.ink,
    valign: "top",
    margin: 0,
    lineSpacingMultiple: 1.14,
  });

  hdr(slide, { x: lx, y: 2.42, w: leftW, text: "How it addresses the problem", color: accent });
  bullets(slide, {
    x: lx,
    y: 2.64,
    w: leftW,
    h: 2.2,
    size: 8.2,
    lineSpacing: 1.08,
    items: SLIDE_2.features,
  });

  hdr(slide, { x: lx, y: 4.94, w: leftW, text: "Innovation and uniqueness", color: accent });
  bullets(slide, {
    x: lx,
    y: 5.16,
    w: leftW,
    h: 1.24,
    size: 8,
    lineSpacing: 1.08,
    items: SLIDE_2.uniqueness,
  });

  drawArchitecture(slide, pptx, { x: rx, y: 1.02, w: rw, h: 4.48, accent });
  drawWeightsStrip(slide, pptx, {
    x: rx,
    y: 5.58,
    w: rw,
    accent,
    title: "PUBLISHED MATCH WEIGHTS — NO BLACK BOX",
    rows: SLIDE_2.weights,
  });
}

function slide3(slide, pptx, accent) {
  const lx = L.marginX;

  hdr(slide, { x: lx, y: 1.02, w: CONTENT_W, text: "Technologies to be used", color: accent });
  const tiles = SLIDE_3.stack;
  const gap = 0.1;
  const tw = (CONTENT_W - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, i) => {
    const tx = lx + i * (tw + gap);
    card(slide, pptx, { x: tx, y: 1.24, w: tw, h: 0.62 });
    slide.addShape(pptx.ShapeType.rect, {
      x: tx,
      y: 1.24,
      w: tw,
      h: 0.055,
      fill: { color: t.brand },
      line: { type: "none" },
    });
    slide.addText(t.name, {
      x: tx + 0.04,
      y: 1.32,
      w: tw - 0.08,
      h: 0.46,
      fontFace: FONT,
      fontSize: 7.4,
      bold: true,
      color: C.ink,
      align: "center",
      valign: "middle",
      margin: 0,
    });
  });
  slide.addText(SLIDE_3.stackNote, {
    x: lx,
    y: 1.9,
    w: CONTENT_W,
    h: 0.24,
    fontFace: FONT,
    fontSize: 7.4,
    color: C.muted,
    align: "center",
    margin: 0,
    valign: "middle",
  });

  hdr(slide, { x: lx, y: 2.2, w: CONTENT_W, text: "Methodology and process", color: accent });
  drawPipeline(slide, pptx, { x: lx, y: 2.44, w: CONTENT_W, accent });

  slide.addText(
    SLIDE_3.methodology.map((m) => ({
      text: m,
      options: { bullet: { code: "25AA" }, breakLine: true },
    })),
    {
      x: lx,
      y: 3.52,
      w: CONTENT_W,
      h: 0.44,
      fontFace: FONT,
      fontSize: 7.8,
      color: C.ink,
      lineSpacingMultiple: 1.05,
      valign: "top",
      margin: 0,
    },
  );

  hdr(slide, { x: lx, y: 4.02, w: CONTENT_W, text: "Working prototype — real screenshots from the live app", color: accent });
  const sg = 0.12;
  const sw = (CONTENT_W - sg * (SLIDE_3.shots.length - 1)) / SLIDE_3.shots.length;
  SLIDE_3.shots.forEach((s, i) => {
    shot(slide, pptx, {
      key: s.key,
      x: lx + i * (sw + sg),
      y: 4.3,
      w: sw,
      h: 1.62,
      accent,
      caption: s.caption,
    });
  });
}

function slide4(slide, pptx, accent) {
  const lx = L.marginX;

  hdr(slide, { x: lx, y: 1.02, w: CONTENT_W, text: "Business model — who pays, and why it survives", color: accent });
  drawBusinessModel(slide, pptx, { x: lx, y: 1.24, w: CONTENT_W, accent });

  hdr(slide, { x: lx, y: 2.6, w: CONTENT_W, text: "Technical · economic · operational feasibility", color: accent });
  const pg = 0.16;
  const pw = (CONTENT_W - pg * 2) / 3;
  SLIDE_4.pillars.forEach((p, i) => {
    const px = lx + i * (pw + pg);
    card(slide, pptx, { x: px, y: 2.82, w: pw, h: 1.84 });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 2.82,
      w: 0.05,
      h: 1.84,
      fill: { color: accent },
      line: { type: "none" },
    });
    slide.addText(p.h, {
      x: px + 0.16,
      y: 2.9,
      w: pw - 0.3,
      h: 0.22,
      fontFace: FONT,
      fontSize: 9.4,
      bold: true,
      color: accent,
      margin: 0,
      valign: "middle",
    });
    slide.addText(
      p.rows.map((r) => ({ text: r, options: { bullet: { code: "25AA" }, breakLine: true } })),
      {
        x: px + 0.16,
        y: 3.14,
        w: pw - 0.3,
        h: 1.44,
        fontFace: FONT,
        fontSize: 7.2,
        color: C.ink,
        lineSpacingMultiple: 1.08,
        paraSpaceAfter: 4,
        valign: "top",
        margin: 0,
      },
    );
  });

  hdr(slide, { x: lx, y: 4.78, w: CONTENT_W, text: "Risky assumptions, and what we do about each", color: accent });
  const rows = SLIDE_4.risks;
  const rw0 = CONTENT_W * 0.42;
  rows.forEach((r, i) => {
    const ry = 5.0 + i * 0.25;
    if (i % 2 === 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: lx,
        y: ry,
        w: CONTENT_W,
        h: 0.24,
        fill: { color: C.wash },
        line: { type: "none" },
      });
    }
    slide.addText(r[0], {
      x: lx + 0.1,
      y: ry,
      w: rw0,
      h: 0.24,
      fontFace: FONT,
      fontSize: 7.2,
      bold: true,
      color: C.ink,
      margin: 0,
      valign: "middle",
    });
    slide.addText(r[1], {
      x: lx + rw0 + 0.1,
      y: ry,
      w: CONTENT_W - rw0 - 0.2,
      h: 0.24,
      fontFace: FONT,
      fontSize: 7.2,
      color: C.muted,
      margin: 0,
      valign: "middle",
    });
  });

  slide.addText(SLIDE_4.scope, {
    x: lx,
    y: 6.06,
    w: CONTENT_W,
    h: 0.28,
    fontFace: FONT,
    fontSize: 7,
    italic: true,
    color: C.muted,
    margin: 0,
    valign: "middle",
  });
}

function slide5(slide, pptx, accent) {
  const lx = L.marginX;

  const mg = 0.14;
  const mw = (CONTENT_W - mg * 3) / 4;
  SLIDE_5.metrics.forEach((m, i) => {
    metric(slide, pptx, {
      x: lx + i * (mw + mg),
      y: 1.02,
      w: mw,
      h: 0.8,
      value: m.value,
      label: m.label,
      color: accent,
    });
  });

  hdr(slide, { x: lx, y: 1.92, w: CONTENT_W, text: "Who benefits, and what actually changes", color: accent });

  const leftW = 7.35;
  SLIDE_5.beneficiaries.forEach((r, i) => {
    const ry = 2.14 + i * 0.52;
    card(slide, pptx, { x: lx, y: ry, w: leftW, h: 0.48, fill: i % 2 === 0 ? C.white : C.wash });
    slide.addText(r[0], {
      x: lx + 0.14,
      y: ry,
      w: 1.66,
      h: 0.48,
      fontFace: FONT,
      fontSize: 8.4,
      bold: true,
      color: accent,
      margin: 0,
      valign: "middle",
    });
    slide.addText(r[1], {
      x: lx + 1.86,
      y: ry,
      w: leftW - 2.0,
      h: 0.48,
      fontFace: FONT,
      fontSize: 7.2,
      color: C.ink,
      margin: 0,
      valign: "middle",
      lineSpacingMultiple: 1.04,
    });
  });

  // Evidence screenshots, stacked in the right column at a readable size.
  const sx = lx + leftW + 0.24;
  const sw = CONTENT_W - leftW - 0.24;
  shot(slide, pptx, { key: "institute", x: sx, y: 2.14, w: sw, h: 1.85, accent, caption: SLIDE_5.shots[0].caption });
  shot(slide, pptx, { key: "portfolio", x: sx, y: 4.32, w: sw, h: 1.85, accent, caption: SLIDE_5.shots[1].caption });

  hdr(slide, { x: lx, y: 4.4, w: leftW, text: "Alignment and evidence base", color: accent });
  slide.addText(SLIDE_5.policy, {
    x: lx,
    y: 4.62,
    w: leftW,
    h: 0.42,
    fontFace: FONT,
    fontSize: 7.6,
    color: C.ink,
    margin: 0,
    valign: "top",
    lineSpacingMultiple: 1.06,
  });
  slide.addText(
    SLIDE_5.citations.map((c) => ({ text: c, options: { bullet: { code: "25AA" }, breakLine: true } })),
    {
      x: lx,
      y: 5.1,
      w: leftW,
      h: 1.2,
      fontFace: FONT,
      fontSize: 7.2,
      color: C.muted,
      lineSpacingMultiple: 1.12,
      paraSpaceAfter: 4,
      valign: "top",
      margin: 0,
    },
  );
}

function slide6(slide, pptx, accent) {
  const lx = L.marginX;
  const leftW = 7.5;
  const rx = lx + leftW + 0.24;
  const rw = CONTENT_W - leftW - 0.24;

  hdr(slide, { x: lx, y: 1.02, w: leftW, text: "How we compare with existing systems", color: accent });

  const cols = SLIDE_6.comparison.columns;
  const colW = [2.86, 1.0, 0.94, 0.76, 1.0, 0.94];
  const head = cols.map((c, i) => ({
    text: c,
    options: {
      bold: true,
      color: C.white,
      fill: { color: i === 1 ? accent : C.ink },
      fontSize: 6.8,
      align: i === 0 ? "left" : "center",
      valign: "middle",
    },
  }));
  const body = SLIDE_6.comparison.rows.map((r, ri) =>
    r.map((cell, ci) => {
      const yes = cell === "yes";
      const no = cell === "no";
      const text = ci === 0 ? cell : yes ? "YES" : no ? "—" : "PART";
      return {
        text,
        options: {
          fontSize: ci === 0 ? 6.8 : 6.4,
          bold: ci === 0 || (ci === 1 && yes),
          color: ci === 0 ? C.ink : ci === 1 ? (yes ? C.green : C.faint) : no ? C.faint : C.saffron,
          align: ci === 0 ? "left" : "center",
          valign: "middle",
          fill: { color: ci === 1 ? C.greenWash : ri % 2 ? C.white : C.wash },
        },
      };
    }),
  );
  slide.addTable([head, ...body], {
    x: lx,
    y: 1.24,
    w: leftW,
    colW,
    rowH: 0.29,
    fontFace: FONT,
    border: { type: "solid", color: C.line, pt: 0.5 },
    margin: 0.05,
    autoPage: false,
  });

  slide.addText(SLIDE_6.comparisonNote, {
    x: lx,
    y: 3.68,
    w: leftW,
    h: 0.58,
    fontFace: FONT,
    fontSize: 7.4,
    color: C.ink,
    margin: 0,
    valign: "top",
    lineSpacingMultiple: 1.1,
  });

  hdr(slide, { x: lx, y: 4.38, w: leftW, text: "Where we are", color: accent });
  drawProgress(slide, pptx, { x: lx, y: 4.6, w: leftW, accent });

  // Demo link strip — the video is emphatic that this must be present.
  const dy = 5.28;
  card(slide, pptx, { x: lx, y: dy, w: leftW, h: 0.9, fill: C.greenWash, border: C.green });
  slide.addText("LIVE PROTOTYPE", {
    x: lx + 0.18,
    y: dy + 0.08,
    w: leftW - 0.36,
    h: 0.18,
    fontFace: FONT,
    fontSize: 7,
    bold: true,
    color: C.green,
    charSpacing: 0.8,
    margin: 0,
    valign: "middle",
  });
  if (/\{\{[^}]+\}\}/.test(META.demoUrl)) {
    slide.addText("to be added before submission", {
      x: lx + 0.18,
      y: dy + 0.27,
      w: leftW - 0.36,
      h: 0.28,
      fontFace: FONT,
      fontSize: 13,
      italic: true,
      color: C.faint,
      margin: 0,
      valign: "middle",
    });
  } else {
    slide.addText(META.demoUrl, {
      x: lx + 0.18,
      y: dy + 0.27,
      w: leftW - 0.36,
      h: 0.28,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: C.ink,
      margin: 0,
      valign: "middle",
    });
  }
  slide.addText(SLIDE_6.demoNote, {
    x: lx + 0.18,
    y: dy + 0.58,
    w: leftW - 0.36,
    h: 0.22,
    fontFace: FONT,
    fontSize: 6.6,
    color: C.muted,
    margin: 0,
    valign: "middle",
  });

  hdr(slide, { x: rx, y: 1.02, w: rw, text: "Research and references", color: accent });
  SLIDE_6.references.forEach((r, i) => {
    const ry = 1.24 + i * 0.645;
    slide.addShape(pptx.ShapeType.rect, {
      x: rx,
      y: ry + 0.04,
      w: 0.045,
      h: 0.5,
      fill: { color: i === 7 ? C.faint : accent },
      line: { type: "none" },
    });
    slide.addText(`${String(i + 1).padStart(2, "0")}`, {
      x: rx + 0.14,
      y: ry,
      w: 0.3,
      h: 0.16,
      fontFace: FONT,
      fontSize: 6.4,
      bold: true,
      color: C.faint,
      margin: 0,
      valign: "middle",
    });
    slide.addText(r.t, {
      x: rx + 0.14,
      y: ry + 0.15,
      w: rw - 0.3,
      h: 0.3,
      fontFace: FONT,
      fontSize: 7,
      color: C.ink,
      margin: 0,
      valign: "top",
      lineSpacingMultiple: 1.04,
    });
    slide.addText(r.u, {
      x: rx + 0.14,
      y: ry + 0.46,
      w: rw - 0.3,
      h: 0.16,
      fontFace: FONT,
      fontSize: 6.4,
      bold: true,
      color: i === 7 ? C.faint : accent,
      margin: 0,
      valign: "middle",
    });
    if (i < SLIDE_6.references.length - 1) {
      rule(slide, pptx, { x: rx + 0.14, y: ry + 0.63, w: rw - 0.28, color: C.line });
    }
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Draw all six slides onto a pptx instance. Exported so the DOM preview
 * (`preview.mjs`) can replay the identical drawing calls and catch layout
 * problems without needing PowerPoint or LibreOffice installed.
 */
export function renderDeck(pptx) {
  const renderers = [slide1, slide2, slide3, slide4, slide5, slide6];
  const pills = [SLIDE_1.pill, SLIDE_2.pill, SLIDE_3.pill, SLIDE_4.pill, SLIDE_5.pill, SLIDE_6.pill];

  renderers.forEach((render, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: C.white };
    // Chrome first so the cityscape watermark sits behind the content.
    chrome(slide, pptx, {
      pill: pills[i],
      accent: ACCENTS[i],
      green: ACCENTS[i] === C.green,
    });
    render(slide, pptx, ACCENTS[i]);
  });
}

export const DECK_META = { SHOTS_DIR, SHOT_FILES };

function main() {
  const { errors, unresolved } = validate();

  if (errors.length) {
    console.error("\nDECK VALIDATION FAILED — nothing was written:\n");
    errors.forEach((e) => console.error(`  x ${e}`));
    console.error("");
    process.exit(1);
  }

  if (unresolved.length) {
    const banner = [
      "",
      "  UNRESOLVED FIELDS — this deck is a DRAFT and cannot be submitted yet:",
      ...unresolved.map((u) => `    - ${u}`),
      "",
      "  Fill them in scripts/deck/content.mjs and rebuild.",
      "",
    ].join("\n");
    if (STRICT) {
      console.error(banner);
      process.exit(1);
    }
    console.warn(banner);
  }

  mkdirSync(BUILD_DIR, { recursive: true });

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "SIH16x9", width: SLIDE.w, height: SLIDE.h });
  pptx.layout = "SIH16x9";
  pptx.author = `Team ${META.team}`;
  pptx.company = META.org;
  pptx.title = `${META.ideaTitle} — SIH 2026 Problem Statement ${META.psId}`;
  pptx.subject = META.psTitle;

  renderDeck(pptx);

  const shotsPresent = Object.values(SHOT_FILES).filter((f) => existsSync(join(SHOTS_DIR, f)));
  const out = join(BUILD_DIR, "AVSAR_SIH2026_Zencoderss_6slide.pptx");

  pptx.writeFile({ fileName: out }).then(() => {
    console.log(`\n  built  ${out}`);
    console.log(
      `  slides 6  ·  screenshots available ${shotsPresent.length}/${Object.keys(SHOT_FILES).length}`,
    );
    if (unresolved.length) console.log(`  DRAFT  ${unresolved.length} unresolved field(s)`);
    console.log("");
  });
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
