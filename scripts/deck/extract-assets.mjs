// Pulls the template chrome out of the user's archived deck.
//
//   node scripts/deck/extract-assets.mjs
//
// `PPT/archive/AVSAR_SIH2026_Zencoderss_12slide.pptx` was built on the official SIH 2026
// template, so the cityscape band and the Zencoderss wordmark are already inside it as
// embedded media. Extracting them gives pixel-identical chrome; redrawing would not.
//
// Dumps every image to `PPT/build/assets/extracted/` with its real pixel dimensions, so
// the right files can be identified by aspect ratio rather than guesswork.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SRC = join(REPO_ROOT, "PPT", "archive", "AVSAR_SIH2026_Zencoderss_12slide.pptx");
const OUT = join(REPO_ROOT, "PPT", "build", "assets", "extracted");

/** PNG: IHDR width/height at byte offsets 16 and 20. */
function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** JPEG: walk the marker segments to the Start-Of-Frame. */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function dims(buf, name) {
  if (name.endsWith(".png")) return pngSize(buf);
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return jpegSize(buf);
  return null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const zip = await JSZip.loadAsync(await (await import("node:fs/promises")).readFile(SRC));
  const media = Object.keys(zip.files).filter((n) => n.startsWith("ppt/media/"));

  const rows = [];
  for (const name of media) {
    const buf = await zip.file(name).async("nodebuffer");
    const size = dims(buf, name);
    const base = name.split("/").pop();
    writeFileSync(join(OUT, base), buf);
    rows.push({
      base,
      kb: Math.round(buf.length / 1024),
      w: size?.w ?? null,
      h: size?.h ?? null,
      aspect: size ? Number((size.w / size.h).toFixed(3)) : null,
    });
  }

  rows.sort((a, b) => (b.aspect ?? 0) - (a.aspect ?? 0));

  console.log(`\n  ${rows.length} embedded images from ${SRC.split(/[\\/]/).slice(-1)[0]}\n`);
  console.log("  file                    KB     WxH          aspect");
  console.log("  ------------------------------------------------------");
  for (const r of rows) {
    console.log(
      `  ${r.base.padEnd(22)} ${String(r.kb).padStart(4)}  ${String(r.w ?? "?").padStart(5)}x${String(r.h ?? "?").padEnd(5)} ${r.aspect ?? ""}`,
    );
  }
  console.log(`\n  extracted to ${OUT}\n`);
}

main().catch((err) => {
  console.error(`  extract failed: ${err.message}`);
  process.exit(1);
});
