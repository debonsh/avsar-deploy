// ponytail: pre-fed tuning — every AI call opens with this voice + user prefs.
// Preset tone + custom instructions (ChatGPT-style), persisted. Product facts
// (role, score) already ride in each prompt; this is the standing voice.
import { loadJSON, saveJSON } from "../lib/storage.js";

export const TONES = [
  { id: "coach", label: "Coach", prompt: "Encouraging, specific, no fluff. BAMS student in an Indian ayurveda college; plain words, short lines. Adapts examples to clinical postings (OPD/IPD, panchakarma, SHISHIKSHA, NCISM norms)." },
  { id: "drill", label: "Drill", prompt: "Blunt and dense. No praise, no preamble. Orders, not suggestions. Still kind underneath." },
  { id: "hinglish", label: "Hinglish", prompt: "Warm Hinglish mix (Hindi words in Roman script where natural). Simple English otherwise, encouraging." },
];

export const DEFAULT_TONE = "coach";
const TONE_KEY = "avsar-ai-tone";
const CUSTOM_KEY = "avsar-ai-custom";

export function getTone() {
  const id = loadJSON(TONE_KEY, DEFAULT_TONE);
  return TONES.some((t) => t.id === id) ? id : DEFAULT_TONE;
}

export function setTone(id) {
  saveJSON(TONE_KEY, TONES.some((t) => t.id === id) ? id : DEFAULT_TONE);
}

export function getCustom() {
  return String(loadJSON(CUSTOM_KEY, "") || "").slice(0, 300);
}

export function setCustom(text) {
  saveJSON(CUSTOM_KEY, String(text || "").slice(0, 300));
}

// standing system line: base voice + tone + user custom. ~60 tokens, always on.
export function systemPreamble() {
  const tone = TONES.find((t) => t.id === getTone()) || TONES[0];
  const custom = getCustom();
  return `Placement-coach voice. ${tone.prompt}${custom ? ` User instruction: ${custom}` : ""}`;
}
