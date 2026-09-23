// Bilingual chrome (EN/HI) — India-context requirement, not a gimmick.
// One dictionary, key parity enforced by tests/i18n.test.js; shell + key
// screens read t(lang, key). Devanagari rendering is covered by the
// Noto Sans Devanagari body fallback in index.css.
import { loadText, saveText } from "./storage.js";

const KEY = "avsar-lang";
export const LANGS = [
  { id: "en", label: "English", short: "EN" },
  { id: "hi", label: "हिंदी", short: "हि" },
];

export const STRINGS = {
  en: {
    "nav.home": "Home",
    "nav.journey": "Journey",
    "nav.internships": "Internships",
    "nav.quests": "Quests",
    "nav.profile": "Profile",
    "nav.resume": "Resume",
    "nav.jobs": "Jobs",
    "nav.more": "More",
    "nav.skip": "Skip to content",
    "theme.toLight": "Switch to light theme",
    "theme.toDark": "Switch to dark theme",
    "lang.switch": "हिंदी में देखें",
    "readiness.score": "Score resume",
    "readiness.ready": "Ready",
    "more.resume": "Resume score",
    "more.quiz": "Quiz",
    "more.interview": "Interview prep",
    "more.portfolio": "Portfolio",
    "more.institute": "Institute",
    "more.industry": "For hospitals",
    "more.faculty": "Faculty",
    "more.match": "How we match",
    "more.programs": "Programs",
    "more.workspace": "Workspace",
    "more.ayush": "Ayush home",
    "footer.tag": "Score your AYUSH resume, close skill gaps with quests, and apply to internships through one tracked pipeline.",
    "footer.upskill": "Upskill",
    "footer.career": "Career",
  },
  hi: {
    "nav.home": "होम",
    "nav.journey": "यात्रा",
    "nav.internships": "इंटर्नशिप",
    "nav.quests": "क्वेस्ट",
    "nav.profile": "प्रोफ़ाइल",
    "nav.resume": "रेज़्यूमे",
    "nav.jobs": "नौकरियां",
    "nav.more": "और",
    "nav.skip": "मुख्य सामग्री पर जाएं",
    "theme.toLight": "लाइट थीम पर जाएं",
    "theme.toDark": "डार्क थीम पर जाएं",
    "lang.switch": "View in English",
    "readiness.score": "रेज़्यूमे स्कोर करें",
    "readiness.ready": "तैयार",
    "more.resume": "रेज़्यूमे स्कोर",
    "more.quiz": "क्विज़",
    "more.interview": "इंटरव्यू तैयारी",
    "more.portfolio": "पोर्टफोलियो",
    "more.institute": "संस्थान",
    "more.industry": "अस्पतालों के लिए",
    "more.faculty": "फैकल्टी",
    "more.match": "मैच कैसे होता है",
    "more.programs": "प्रोग्राम",
    "more.workspace": "वर्कस्पेस",
    "more.ayush": "आयुष होम",
    "footer.tag": "अपना AYUSH रेज़्यूमे स्कोर करें, क्वेस्ट से स्किल गैप बंद करें, और एक ट्रैक की गई पाइपलाइन से इंटर्नशिप के लिए आवेदन करें।",
    "footer.upskill": "स्किल बढ़ाएं",
    "footer.career": "करियर",
  },
};

export function loadLang() {
  return loadText(KEY, "en") === "hi" ? "hi" : "en";
}

export function saveLang(lang) {
  saveText(KEY, lang === "hi" ? "hi" : "en");
}

export function t(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}
