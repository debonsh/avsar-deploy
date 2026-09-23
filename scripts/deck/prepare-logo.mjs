// Prepares the official SIH logo assets for the deck header.
//
//   node scripts/deck/prepare-logo.mjs
//
// The source asset is a 1536x1024 JPEG of the SIH 2026 lockup on white, with a
// wide white margin. Placed straight into a header slot the mark is illegible, so
// this: (1) trims the margin, (2) detects the horizontal whitespace band that
// separates the bulb mark from the "SMART INDIA HACKATHON" wordmark, and
// (3) emits the mark on its own. The header then lays the mark and the wording
// out side by side, which is the only way a portrait logo fits a header band.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SRC = join(REPO_ROOT, "PPT", "SIH-Winners-PPt-and-Sources-main", "assets", "sih-logo.jpeg");
const OUT_DIR = join(REPO_ROOT, "PPT", "build", "assets");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("about:blank");

  // Inline as a data URL: a file:// image would taint the canvas and getImageData
  // would throw.
  const dataUri = `data:image/jpeg;base64,${readFileSync(SRC).toString("base64")}`;

  const result = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = src;
    });

    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    const ink = (x, y) => {
      const i = (y * width + x) * 4;
      return data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235;
    };

    // Rows that contain any ink.
    const rowInk = new Array(height).fill(false);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (ink(x, y)) {
          rowInk[y] = true;
          break;
        }
      }
    }

    // Contiguous ink bands, separated by blank rows.
    const raw = [];
    let start = -1;
    for (let y = 0; y < height; y += 1) {
      if (rowInk[y] && start < 0) start = y;
      if (!rowInk[y] && start >= 0) {
        raw.push({ y0: start, y1: y - 1 });
        start = -1;
      }
    }
    if (start >= 0) raw.push({ y0: start, y1: height - 1 });
    if (raw.length < 2) return null;

    // The bulb's radiating lines make several bands. Rather than guess a merge
    // threshold, split at the single widest blank gap: that is the mark/wordmark
    // separation.
    let splitAt = 1;
    let widest = -1;
    for (let i = 1; i < raw.length; i += 1) {
      const gap = raw[i].y0 - raw[i - 1].y1;
      if (gap > widest) {
        widest = gap;
        splitAt = i;
      }
    }
    const markBands = raw.slice(0, splitAt);
    const bands = [
      { y0: markBands[0].y0, y1: markBands[markBands.length - 1].y1 },
      { y0: raw[splitAt].y0, y1: raw[raw.length - 1].y1 },
    ];

    // Column bounds for a given row range.
    const colBounds = (y0, y1) => {
      let minX = width;
      let maxX = -1;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (!ink(x, y)) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
      return { minX, maxX };
    };

    const crop = (x0, y0, w, h) => {
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      out.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, w, h);
      return out.toDataURL("image/png");
    };

    const pad = 8;
    // The mark is the first band (bulb + "SIH 2026"); the wordmark follows.
    const markBand = bands[0];
    const markCols = colBounds(markBand.y0, markBand.y1);
    const mx = Math.max(0, markCols.minX - pad);
    const my = Math.max(0, markBand.y0 - pad);
    const mw = Math.min(width - mx, markCols.maxX - markCols.minX + pad * 2);
    const mh = Math.min(height - my, markBand.y1 - markBand.y0 + pad * 2);

    const topBand = bands[0];
    const botBand = bands[bands.length - 1];
    const fullCols = colBounds(topBand.y0, botBand.y1);
    const fx = Math.max(0, fullCols.minX - pad);
    const fy = Math.max(0, topBand.y0 - pad);
    const fw = Math.min(width - fx, fullCols.maxX - fullCols.minX + pad * 2);
    const fh = Math.min(height - fy, botBand.y1 - topBand.y0 + pad * 2);

    return {
      full: { url: crop(fx, fy, fw, fh), w: fw, h: fh },
      mark: { url: crop(mx, my, mw, mh), w: mw, h: mh },
      bands: bands.length,
    };
  }, dataUri);

  await browser.close();
  if (!result) throw new Error("could not find the mark inside the asset");

  const write = (name, entry) => {
    const b64 = entry.url.replace(/^data:image\/png;base64,/, "");
    const out = join(OUT_DIR, name);
    writeFileSync(out, Buffer.from(b64, "base64"));
    console.log(`  ${name}  ${entry.w}x${entry.h}`);
  };

  write("sih-logo-trim.png", result.full);
  write("sih-mark.png", result.mark);
  console.log(`  detected ${result.bands} ink band(s)`);
}

main().catch((err) => {
  console.error(`  logo prep failed: ${err.message}`);
  process.exit(1);
});
