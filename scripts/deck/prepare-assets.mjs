// Builds the deck's chrome assets from the official-template exports, and the new logo.
//
//   node scripts/deck/prepare-assets.mjs
//
// Sources are the two full-slide template exports found inside the user's archived deck
// (written to assets/extracted by extract-assets.mjs):
//   image1.png  1320x739  IDEA TITLE        -> green chrome
//   image2.png  1317x733  TECHNICAL APPROACH -> navy/grey chrome
//
// The template ships no isolated cityscape or wordmark, so both are cropped out of those
// exports. Cropping gives pixel-identical chrome; redrawing would not.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const ASSETS = join(REPO_ROOT, "PPT", "build", "assets");
const SRC = join(ASSETS, "extracted");

const GREEN_SLIDE = join(SRC, "image1.png"); // green chrome
const GREY_SLIDE = join(SRC, "image2.png"); // navy/grey chrome

// Crop boxes in source pixels, measured off the template exports.
// The cityscape is a bottom-anchored watermark; it stops just above the accent bar.
const CITYSCAPE = { x: 0, y: 440, w: null, h: 279 };
const WORDMARK = { x: 30, y: 12, w: 216, h: 50 };

/** The new Avsar mark: green, "opportunity" read as an ascending path toward a rising star. */
const AVSAR_SVG = (green, muted) => `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="180" viewBox="0 0 720 180">
  <rect x="6" y="26" width="128" height="128" rx="34" fill="${green}"/>
  <rect x="36" y="100" width="17" height="28" rx="6" fill="#fff"/>
  <rect x="61" y="84" width="17" height="44" rx="6" fill="#fff"/>
  <rect x="86" y="68" width="17" height="60" rx="6" fill="#fff"/>
  <path d="M42 78 L86 52" fill="none" stroke="#fff" stroke-width="9"
        stroke-linecap="round"/>
  <path d="M106 29 L108.8 37.2 L117 40 L108.8 42.8 L106 51 L103.2 42.8 L95 40 L103.2 37.2 Z"
        fill="#fff"/>
  <text x="162" y="110" font-family="Inter, Arial, Helvetica, sans-serif"
        font-size="86" font-weight="800" letter-spacing="-2" fill="${green}">Avsar</text>
  <text x="166" y="142" font-family="Inter, Arial, Helvetica, sans-serif"
        font-size="19" font-weight="600" letter-spacing="2.6" fill="${muted}">
    SKILLS TODAY  |  OPPORTUNITIES TOMORROW
  </text>
</svg>`;

async function main() {
  mkdirSync(ASSETS, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("about:blank");

  const toDataUri = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;

  // Crops both chrome versions and renders the logo, all in one page.
  const out = await page.evaluate(
    async ({ greenSrc, greySrc, city, mark, svg }) => {
      const load = async (src) => {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = src;
        });
        return img;
      };

      const cropToDataUri = async (src, box) => {
        const img = await load(src);
        const w = box.w ?? img.naturalWidth;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = box.h;
        c.getContext("2d").drawImage(img, box.x, box.y, w, box.h, 0, 0, w, box.h);
        return { url: c.toDataURL("image/png"), w, h: box.h };
      };

      const cityGreen = await cropToDataUri(greenSrc, city);
      const cityGrey = await cropToDataUri(greySrc, city);
      const wordmark = await cropToDataUri(greenSrc, mark);

      // Render the SVG logo at 3x for crisp placement.
      const svgBlob = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      const logo = await load(svgBlob);
      const scale = 3;
      const lc = document.createElement("canvas");
      lc.width = logo.naturalWidth * scale;
      lc.height = logo.naturalHeight * scale;
      const lctx = lc.getContext("2d");
      lctx.scale(scale, scale);
      lctx.drawImage(logo, 0, 0);

      return {
        cityGreen,
        cityGrey,
        wordmark,
        logo: { url: lc.toDataURL("image/png"), w: logo.naturalWidth, h: logo.naturalHeight },
      };
    },
    {
      greenSrc: toDataUri(GREEN_SLIDE),
      greySrc: toDataUri(GREY_SLIDE),
      city: CITYSCAPE,
      mark: WORDMARK,
      svg: AVSAR_SVG("#138808", "#5B6472"),
    },
  );

  await browser.close();

  const write = (name, entry) => {
    const b64 = entry.url.replace(/^data:image\/png;base64,/, "");
    const dest = join(ASSETS, name);
    writeFileSync(dest, Buffer.from(b64, "base64"));
    console.log(`  ${name.padEnd(24)} ${entry.w}x${entry.h}`);
  };

  write("cityscape-green.png", out.cityGreen);
  write("cityscape-grey.png", out.cityGrey);
  write("zencoderss-wordmark.png", out.wordmark);
  write("avsar-logo.png", out.logo);

  console.log(`\n  written to ${ASSETS}\n`);
}

main().catch((err) => {
  console.error(`  asset prep failed: ${err.message}`);
  process.exit(1);
});
