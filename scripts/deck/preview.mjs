// Renders the deck to PNGs without PowerPoint or LibreOffice.
//
//   node scripts/deck/preview.mjs
//
// Replays the exact same drawing calls the pptx builder makes, but into an
// absolutely-positioned DOM instead of OOXML, then screenshots each slide with
// Chromium. It is an approximation of PowerPoint's text engine, not a
// substitute — but it catches the things that actually break a layout blind:
// overflow past the slide edge, overlapping boxes, and text taller than its box.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { SLIDE, C, FONT } from "./theme.mjs";
import { renderDeck } from "./build-deck.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(HERE, "..", "..");
const BUILD_DIR = join(APP_ROOT, "..", "PPT", "build");
const OUT = join(BUILD_DIR, "preview");

const IN = 100; // px per inch
const pt2px = (pt) => pt * (IN / 72);

// ── Drawing shim ─────────────────────────────────────────────────────────────

function createSlide() {
  const ops = [];
  return {
    ops,
    background: null,
    addShape(type, o) {
      ops.push({ kind: "shape", type, ...o });
    },
    addText(text, o) {
      ops.push({ kind: "text", text, ...o });
    },
    addImage(o) {
      ops.push({ kind: "image", ...o });
    },
    addTable(rows, o) {
      ops.push({ kind: "table", rows, ...o });
    },
  };
}

function createShimPptx() {
  const slides = [];
  return {
    ShapeType: { roundRect: "roundRect", rect: "rect", line: "line", ellipse: "ellipse", hexagon: "hexagon" },
    addSlide() {
      const s = createSlide();
      slides.push(s);
      return s;
    },
    slides,
  };
}

// ── Serialisation ────────────────────────────────────────────────────────────

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function px(v, base = 0) {
  return `${(base + (v ?? 0)) * IN}px`;
}

function hex(c, fallback = "transparent") {
  return c ? `#${String(c).replace(/^#/, "")}` : fallback;
}

function box(o) {
  return `left:${px(o.x)};top:${px(o.y)};width:${px(o.w)};height:${px(o.h)};`;
}

/** Group runs into paragraphs, honouring `breakLine`. */
function toParagraphs(text) {
  const runs = Array.isArray(text) ? text : [{ text, options: {} }];
  const paras = [];
  let cur = [];
  for (const r of runs) {
    cur.push(r);
    if (r.options?.breakLine) {
      paras.push(cur);
      cur = [];
    }
  }
  if (cur.length) paras.push(cur);
  return paras.map((p) => ({ runs: p, bullet: Boolean(p[0]?.options?.bullet) }));
}

function runHtml(r) {
  const o = r.options || {};
  const style = [
    o.fontSize ? `font-size:${pt2px(o.fontSize)}px` : "",
    o.bold ? "font-weight:700" : "",
    o.italic ? "font-style:italic" : "",
    o.color ? `color:${hex(o.color)}` : "",
    o.charSpacing ? `letter-spacing:${o.charSpacing * 0.4}px` : "",
  ]
    .filter(Boolean)
    .join(";");
  const br = o.breakLine ? "<br/>" : "";
  return `<span style="${style}">${esc(r.text)}</span>${br}`;
}

function textHtml(o) {
  const opts = o;
  const paras = toParagraphs(o.text);
  const align = opts.align || "left";
  const valign =
    opts.valign === "middle" ? "center" : opts.valign === "bottom" ? "flex-end" : "flex-start";
  const base = opts.fontSize ? `font-size:${pt2px(opts.fontSize)}px;` : "";
  const lh = opts.lineSpacingMultiple ? `line-height:${opts.lineSpacingMultiple};` : "line-height:1.25;";
  const ps = opts.paraSpaceAfter ? `margin-bottom:${pt2px(opts.paraSpaceAfter)}px;` : "";
  const body = paras
    .map((p) => {
      const inner = p.runs.map(runHtml).join("");
      return p.bullet
        ? `<div style="display:flex;gap:6px;${ps}"><span style="flex:0 0 auto">&#9642;</span><span>${inner}</span></div>`
        : `<div style="${ps}">${inner}</div>`;
    })
    .join("");
  return `<div style="${box(o)}position:absolute;display:flex;flex-direction:column;justify-content:${valign};
    align-items:${align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"};
    text-align:${align};${base}${lh}color:${hex(opts.color, "#111827")};
    font-family:${FONT},Arial,sans-serif;overflow:visible;
    ${opts.italic ? "font-style:italic;" : ""}">${body}</div>`;
}

function shapeHtml(o) {
  const wPx = (o.w ?? 0) * IN;
  const hPx = (o.h ?? 0) * IN;
  const small = Math.min(Math.abs(wPx), Math.abs(hPx));
  const radius =
    o.type === "roundRect" ? small * (o.rectRadius ?? 0.1) : o.type === "ellipse" ? "50%" : 0;
  const isLine = o.type === "line";
  const fill = isLine ? "transparent" : hex(o.fill?.color, "transparent");
  const border = o.line && o.line.type !== "none" && o.line.color
    ? `border:${Math.max(1, (o.line.width ?? 1) * 1.1)}px solid ${hex(o.line.color)};`
    : "";
  const radiusCss = radius === "50%" ? "border-radius:50%;" : radius ? `border-radius:${radius}px;` : "";
  // Arrow heads are drawn as a small triangle so connectors read in the preview.
  let arrow = "";
  if (isLine && o.line?.endArrowType && o.line.endArrowType !== "none") {
    const vertical = Math.abs(o.h ?? 0) > Math.abs(o.w ?? 0);
    const size = 7;
    const at =
      vertical
        ? `left:calc(50% - ${size / 2}px);bottom:-${size}px;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-top:${size}px solid ${hex(o.line.color)};`
        : `right:-${size}px;top:calc(50% - ${size / 2}px);border-top:${size / 2}px solid transparent;border-bottom:${size / 2}px solid transparent;border-left:${size}px solid ${hex(o.line.color)};`;
    arrow = `<div style="position:absolute;width:0;height:0;${at}"></div>`;
  }
  return `<div style="${box(o)}position:absolute;background:${fill};${border}${radiusCss}">${arrow}</div>`;
}

function imageHtml(o) {
  const url = `file:///${String(o.path).replace(/\\/g, "/")}`;
  const fit = o.sizing?.type === "contain" ? "contain" : "cover";
  return `<div style="${box(o)}position:absolute;overflow:hidden;background-image:url('${url}');
    background-size:${fit};background-position:center;background-repeat:no-repeat"></div>`;
}

function tableHtml(o) {
  const colW = o.colW || [];
  const rowH = (o.rowH ?? 0.3) * IN;
  const head = `<colgroup>${colW.map((w) => `<col style="width:${w * IN}px">`).join("")}</colgroup>`;
  const rows = o.rows
    .map((row) => {
      const cells = row
        .map((c) => {
          const co = c.options || {};
          const st = [
            `font-size:${pt2px(co.fontSize ?? 7)}px`,
            co.bold ? "font-weight:700" : "",
            co.color ? `color:${hex(co.color)}` : "",
            co.fill?.color ? `background:${hex(co.fill.color)}` : "",
            `text-align:${co.align || "left"}`,
            "vertical-align:middle",
            "padding:0 4px",
          ]
            .filter(Boolean)
            .join(";");
          return `<td style="${st}">${esc(c.text)}</td>`;
        })
        .join("");
      return `<tr style="height:${rowH}px">${cells}</tr>`;
    })
    .join("");
  return `<table style="${box(o)}position:absolute;border-collapse:collapse;table-layout:fixed;
    font-family:${FONT},Arial,sans-serif;border:1px solid ${hex(C.line)}">${head}${rows}</table>`;
}

function slideHtml(slide, index) {
  const inner = slide.ops
    .map((o) => {
      if (o.kind === "text") return textHtml(o);
      if (o.kind === "shape") return shapeHtml(o);
      if (o.kind === "image") return imageHtml(o);
      if (o.kind === "table") return tableHtml(o);
      return "";
    })
    .join("");
  return `<section class="slide" id="s${index}" style="width:${SLIDE.w * IN}px;height:${SLIDE.h * IN}px;background:#fff">
    ${inner}
  </section>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const shim = createShimPptx();
  renderDeck(shim);

  const slidesHtml = shim.slides.map((s, i) => slideHtml(s, i + 1)).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#8a93a0;font-family:${FONT},Arial,sans-serif}
    .slide{position:relative;overflow:hidden;margin:0 0 24px 0}
  </style></head><body>${slidesHtml}</body></html>`;

  writeFileSync(join(OUT, "deck-preview.html"), html, "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: Math.ceil(SLIDE.w * IN), height: Math.ceil(SLIDE.h * IN) },
    deviceScaleFactor: 2,
  });
  await page.goto(`file:///${join(OUT, "deck-preview.html").replace(/\\/g, "/")}`);
  await page.waitForTimeout(600);

  for (let i = 1; i <= shim.slides.length; i += 1) {
    const el = page.locator(`#s${i}`);
    await el.screenshot({ path: join(OUT, `slide-${i}.png`) });
    console.log(`    preview slide ${i}`);
  }

  await browser.close();
  console.log(`\n  preview written to ${join(OUT, "deck-preview.html")}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`  preview failed: ${err.message}`);
  process.exit(1);
});
