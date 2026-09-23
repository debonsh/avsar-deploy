// ponytail: parse locally, never upload PDF anywhere (privacy line for judges)

async function pdfAdapter(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it) => it.str).join(" ") + "\n";
  }
  return out;
}

async function textAdapter(file) {
  return file.text();
}

export async function parseResumeFile(file) {
  if (!file) return "";
  try {
    if (file.name.toLowerCase().endsWith(".pdf")) return await pdfAdapter(file);
    return await textAdapter(file);
  } catch {
    throw new Error("PDF parse failed. Paste resume text instead.");
  }
}

// ponytail: JobSync-style structured import as regex heuristics, not an NLP lib.
// extractSections returns accept/skip cards; callers persist via saveResumeSections.
const HEADER_MAP = [
  [/experience|employment|work history|internship|projects?/i, "experience"],
  [/education|academic|qualification/i, "education"],
  [/(technical )?skills|tech stack|core competencies/i, "skills"],
  [/certifications?|certificates?|licenses?/i, "certifications"],
];

const SKIP_HEADERS = /summary|objective|profile|contact|declaration|hobbies|languages/i;

export function extractContact(text = "") {
  const t = String(text || "");
  const email = (t.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0] || "";
  const phone = (t.match(/(?:\+\d[\d\s-]{7,}\d|\b\d{10}\b)/) || [])[0] || "";
  const links = [...new Set(t.match(/https?:\/\/[^\s)]*(?:linkedin|github)[^\s)]*/gi) || [])].slice(0, 4);
  const first = (t.split("\n").map((l) => l.trim()).find((l) => l) || "").slice(0, 60);
  const name = !/@/.test(first) && !SKIP_HEADERS.test(first) && !HEADER_MAP.some(([, s]) => first.toLowerCase().includes(s === "experience" ? "experience" : s)) ? first : "";
  return { name, email, phone, links };
}

export function extractSections(text = "") {
  const lines = String(text || "").split("\n");
  const buckets = { experience: [], education: [], skills: [], certifications: [] };
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length < 50) {
      const hit = HEADER_MAP.find(([re]) => re.test(line));
      if (hit) { cur = hit[1]; continue; }
      if (SKIP_HEADERS.test(line)) { cur = null; continue; }
    }
    if (cur) buckets[cur].push(line);
  }
  const out = [];
  const contact = extractContact(text);
  if (contact.email || contact.phone || contact.name || contact.links.length) {
    out.push({ section: "contact", title: "Contact", body: [contact.name, contact.email, contact.phone, ...contact.links].filter(Boolean).join("\n") });
  }
  if (buckets.experience.length) out.push({ section: "experience", title: "Experience", body: buckets.experience.slice(0, 30).join("\n") });
  if (buckets.education.length) out.push({ section: "education", title: "Education", body: buckets.education.slice(0, 15).join("\n") });
  if (buckets.skills.length) {
    const skills = [...new Set(buckets.skills.join(",").split(/[,•\-|/\n]/).map((s) => s.trim()).filter((s) => s && s.length < 30))].slice(0, 20);
    if (skills.length) out.push({ section: "skills", title: "Skills", body: skills.join(", ") });
  }
  if (buckets.certifications.length) out.push({ section: "certifications", title: "Certifications", body: buckets.certifications.slice(0, 10).join("\n") });
  return out;
}
