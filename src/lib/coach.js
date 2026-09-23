// ponytail: prompt builders + offline canned answers. AI upgrades via askCoach, never gates.
import { coursesFor } from "../data/courses.js";
import { extractSkills } from "./store.js";

export const COACH_ACTIONS = [
  { id: "gaps", label: "Explain my gaps" },
  { id: "bullets", label: "Improve my bullets" },
  { id: "interview", label: "Interview tip for my role" },
  { id: "career", label: "What career fits me?" },
  { id: "mentor", label: "Find mentorship" },
  { id: "bams", label: "BAMS deepen" },
  { id: "review", label: "Review my resume" },
  { id: "match", label: "Check my fit" },
  { id: "cover", label: "Write cover letter" },
  { id: "addjob", label: "Add job from posting" },
];

export const TECH_DEEPEN = { id: "roadmap", label: "Level up (L0–L5)" };

// Portal shortcuts: the vaidya portal deepens via BAMS, the tech portal via
// the L0–L5 engineering ladder. COACH_ACTIONS stays the full registry (and
// the tested contract); this is the per-portal view the widget renders.
export function coachActionsFor(role = "ayush") {
  if (role === "ayush") return COACH_ACTIONS;
  return COACH_ACTIONS.map((a) => (a.id === "bams" ? TECH_DEEPEN : a));
}

// Hindi tone: when lang=hi, preface answers with a Hindi wrapper.
const HI = (en, hi) => (lang) => (lang === "hi" ? hi : en);

function ctx(s = {}) {
  const missing = (s.missing || []).slice(0, 3);
  const found = (s.found || []).slice(0, 12);
  const job = s.topJob || null;
  // ponytail: bams track gets clinical voice + examples everywhere below.
  // detected from the role label so no caller changes shape.
  const ayush = /ayush/i.test(s.roleLabel || "") || (s.role || "") === "ayush";
  return {
    ...s, missing, found, ayush, top: missing[0] || "",
    jobTitle: job?.title || "", jobCompany: job?.company || "", jobSkills: job?.skills || [],
  };
}

const AYUSH_WHO = "BAMS student, intern, or young vaidya";

export function buildPrompt(actionId, s = {}) {
  const c = ctx(s);
  const head = c.ayush
    ? `You are a placement coach for a ${AYUSH_WHO} targeting "${c.roleLabel || "an ayush role"}". Current resume score: ${c.score ?? 0}/95. Skills ON their resume: ${c.found.join(", ") || "none listed yet"}. Top missing skills: ${c.missing.join(", ") || "none"}.${c.profileLine ? ` Profile: ${c.profileLine}.` : ""} Speak in clinical terms (OPD/IPD, case sheets, panchakarma, SHISHIKSHA, NCISM norms).`
    : `You are a placement coach for a Tier-2/3 Indian college student targeting "${c.roleLabel || "a tech role"}". Current resume score: ${c.score ?? 0}/95. Skills ON their resume: ${c.found.join(", ") || "none listed yet"}. Top missing skills: ${c.missing.join(", ") || "none"}.${c.profileLine ? ` Profile: ${c.profileLine}.` : ""} Best-fit track: ${c.bestFitLabel || c.roleLabel || "undecided"}.`;
  switch (actionId) {
    case "gaps":
      return `${head}\n\nExplain their gaps in 3 short bullets: why each skill blocks interviews, and the one free resource to start with. Under 120 words.`;
    case "bullets":
      return c.ayush
        ? `${head}\n\nResume excerpt:\n"""\n${(c.resumeText || "").slice(0, 1200)}\n"""\n\nRewrite their 2 weakest lines as clinical bullets: presentation + examination + intervention + outcome with 1 number each (cases seen, sittings assisted, records digitized). Under 150 words.`
        : `${head}\n\nResume excerpt:\n"""\n${(c.resumeText || "").slice(0, 1200)}\n"""\n\nRewrite their 2 weakest lines as STAR bullets (25 words max each, 1 number each). Under 150 words.`;
    case "interview":
      return c.ayush
        ? `${head}\n\nGive one interview tip for a BAMS clinical round: a case-presentation template (complaint, examination, intervention, outcome) plus the single most common intern mistake (vague case sheets). Under 100 words.`
        : `${head}\n\nGive one interview tip for a "${c.roleLabel || "fresher"}" interview: a STAR template plus the single most common fresher mistake. Under 100 words.`;
    case "career":
      return c.ayush
        ? `${head}\n\nShould they aim for clinical practice, research (CCRAS/SPARK), or industry (GMP/QA/wellness)? One verdict plus 2 reasons grounded in their score and skills. Under 100 words.`
        : `${head}\n\nShould they stay on this track or switch? One verdict plus 2 reasons grounded in their score and fit. Under 100 words.`;
    case "ask":
      return `${head}\n\nResume excerpt:\n"""\n${(c.resumeText || "").slice(0, 800)}\n"""\n\nStudent question: ${(s.question || "").slice(0, 500)}\n\nAnswer directly using their resume and skills above, under 120 words.`;
    case "review":
      return `${head}\n\nResume excerpt:\n"""\n${(c.resumeText || "").slice(0, 1500)}\n"""\n\nWrite a full resume review: scores per dimension, 3 strengths, top 3 fixes with free resources. Under 200 words.`;
    case "match":
      return `${head}\n\nJob: ${c.jobTitle || "best eligible role"} at ${c.jobCompany || "a hiring company"} (needs: ${(c.jobSkills || []).join(", ") || "role skills"}).\n\nScore this resume against the job 0-100 with band (strong 80+, good 65+, partial 50+, weak 35+, poor below), then Summary, Skills overlap, Tailoring Tips. Under 200 words.`;
    case "cover":
      return `${head}\n\nJob: ${c.jobTitle || "best eligible role"} at ${c.jobCompany || "a hiring company"}.\n\nWrite a cover letter grounded ONLY in this resume (no invented numbers), first person, 3 short paragraphs, Dear Hiring Manager to Sincerely. Under 250 words.`;
    case "mentor":
      return `${head}\n\nRecommend one mentorship-style next step: a workshop topic, a guest-lecture question to ask, or a 2-week live-project brief that attacks their top gap (${c.top || "strongest missing skill"}). Concrete and beginner-sized. Under 100 words.`;
    case "roadmap":
      return `${head}\n\nLay out their L0–L5 engineering ladder from today's score: what each level means, the one proof that unlocks the next level, and the single cheapest step this week. Under 150 words.`;
    default:
      return head;
  }
}

// --- JobSync assistant tools, offline-first ports ---

// bands copied from JobSync's job-match prompt (80+ strong, 65+ good, 50+ partial, 35+ weak)
export function matchBand(score = 0) {
  if (score >= 80) return "strong fit";
  if (score >= 65) return "good fit";
  if (score >= 50) return "partial fit";
  if (score >= 35) return "weak fit";
  return "poor fit";
}

export function matchJob(found = [], job = null) {
  if (!job || !job.skills?.length) return null;
  const have = new Set((found || []).map((s) => String(s).toLowerCase()));
  const overlap = job.skills.filter((s) => have.has(String(s).toLowerCase()));
  const score = Math.round((overlap.length / job.skills.length) * 100);
  const missing = job.skills.filter((s) => !have.has(String(s).toLowerCase()));
  return { score, band: matchBand(score), overlap, missing };
}

export function matchWriteup(found = [], job = null) {
  const m = matchJob(found, job);
  if (!m) return "Score your resume first, then I'll check its fit against your best eligible job.";
  return `Fit: ${m.score}/100 (${m.band}): ${job.title} at ${job.company}.\nOverlap: ${m.overlap.join(", ") || "none yet"}.\nMissing: ${m.missing.join(", ") || "all covered: apply now"}.\nTip: close "${m.missing[0] || "nothing"}" with one quest pair and re-check fit.`;
}

export function reviewWriteup(s = {}) {
  const c = ctx(s);
  if (!c.score) return "Paste your resume in My Score first, then I'll write the full review with scores and fixes.";
  const lines = (c.breakdown || []).map((b) => `${b.label}: ${b.pts}/${b.max}`).join(" · ") || `resume score ${c.score}/95`;
  return `Resume review: resume score ${c.score}/95 (${lines}).\nStrengths: ${(c.found || []).slice(0, 3).join(", ") || "none listed yet"}.\nTop fixes: ${(c.missing || []).slice(0, 3).map((m) => `${m} (free: ${coursesFor(m)[0].t})`).join("; ") || "all clear: showcase-ready"}.`;
}

export function coverLetter(s = {}) {
  const c = ctx(s);
  if (!c.score) return "Score your resume first: a cover letter needs real bullets to stand on.";
  const job = c.topJob;
  const name = (c.contactName || "An Avsar student").trim();
  const head = job ? `${job.title} at ${job.company}` : (c.roleLabel || "an internship");
  return `Dear Hiring Manager,\n\nI am applying for ${head}. My resume shows ${(c.found || []).slice(0, 3).join(", ") || "hands-on project work"}, and I am closing ${(c.missing || []).slice(0, 2).join(" and ") || "my remaining gaps"} through verified coursework.\n\nWhat I bring on day one: ${(c.found || []).slice(0, 2).join(", ") || "project experience"} with proof links on my portfolio. I would welcome the chance to discuss the role.\n\nSincerely,\n${name}`;
}

// JobSync add-job confirmation pattern: paste → parse → confirm card → save.
export function parseJobPosting(pasted = "") {
  const t = String(pasted || "").replace(/^PASTE:\s*/i, "").trim();
  if (t.length < 20) return null;
  const pick = (re) => (t.match(re) || [])[1]?.trim() || "";
  const company = pick(/(?:company|org|at)\s*[:-]\s*(.+)/i) || (t.match(/ at ([A-Z][\w& ]{1,40})/) || [])[1]?.trim() || "Unknown company";
  const title = pick(/(?:title|role|position)\s*[:-]\s*(.+)/i) || t.split("\n")[0].slice(0, 80);
  const location = pick(/(?:location|loc)\s*[:-]\s*(.+)/i) || (/remote/i.test(t) ? "Remote" : "Not specified");
  const type = pick(/(?:type|employment)\s*[:-]\s*(.+)/i) || (/full-?time/i.test(t) ? "Full-time" : "Internship");
  return {
    id: `pasted-${Date.now()}`,
    role: "sde",
    title,
    company,
    loc: location,
    type,
    skills: extractSkills(t),
    minScore: 0,
    apply: pick(/(?:apply|url|link)\s*[:-]\s*(https?:\/\/\S+)/i) || "#",
    description: t.slice(0, 2000),
  };
}

export function localAnswer(actionId, s = {}) {
  const c = ctx(s);
  if (actionId === "gaps") {
    if (!c.score) return "Score your resume first (Resume: paste, score), then I'll rank your gaps by open-job demand and point each one to a free course.";
    if (!c.top) {
      return c.ayush
        ? `No gaps detected at resume score ${c.score}, job-ready on paper. Next lift: quiz best plus quest proof pushes readiness past 65 for vaidya.`
        : `No gaps detected at resume score ${c.score}, job-ready on paper. Next lift: quiz best plus quest proof pushes readiness past 65 for L3 Associate.`;
    }
    const course = coursesFor(c.top)[0];
    const closer = c.ayush
      ? "Close it with one logbook entry plus a proof link, re-score, and watch your score move."
      : "Close it with one quest pair plus a proof link, re-score, and watch your score move.";
    return `Your #1 gap is ${c.top}: it shows up in the most open ${c.roleLabel || ""} roles. Start here: ${course.t} (${course.u}). ${closer} Rest of the list: ${c.missing.slice(1).join(", ") || "none"}.`;
  }
  if (actionId === "bullets") {
    if (c.ayush) return `Clinical bullets that clear screening: complaint plus examination in 5 words, intervention with a precise verb, outcome with 1 number. Template: "Assisted ${c.top || "panchakarma"} sittings for N patients, documented M case sheets." Hunt your real numbers (cases seen, sittings assisted, records digitized), paste them in, re-score.`;
    return `STAR bullets that clear screening: Situation plus Task in 5 words, Action with a strong verb, Result with 1 number. Template for ${c.roleLabel || "your role"}: "Built ${c.top || "a key"} feature for N users, cutting load time by X%." Hunt your real numbers (users, marks, tests written), paste them in, re-score.`;
  }
  if (actionId === "interview") {
    if (c.ayush) return `BAMS clinical rounds grade case presentation plus numbers: open with the complaint, keep each answer under 3 sentences, name one protocol you followed (${c.top || "your top gap"}). Biggest intern mistake is vague case sheets: write complaint, examination, intervention, outcome every time. Warm up in the Interview tab: 5 questions, STAR-graded.`;
    return `${c.roleLabel || "Fresher"} interviews grade STAR plus numbers: open with the Result, keep each answer under 3 sentences, name one tool the role expects (${c.top || "your top gap"}). Biggest fresher mistake is "I guess / maybe": replace with what you measured. Warm up in the Interview tab: 5 questions, STAR-graded.`;
  }
  if (actionId === "career") {
    if (c.ayush) return `Best fit right now: ${c.bestFitLabel || c.roleLabel || "ayush"} at resume score ${c.score ?? 0}. ${!c.bestFitLabel || c.bestFitLabel === c.roleLabel ? "Stay the clinical course: practice, CCRAS research, or GMP industry all read off these same skills." : `Your lines lean ${c.bestFitLabel}: score this same resume on that track before switching.`} Cheapest test either way: one SHISHIKSHA checklist item plus a proof link.`;
    const fit = c.bestFitLabel || c.roleLabel || "your current track";
    const stay = !c.bestFitLabel || c.bestFitLabel === c.roleLabel;
    return `Best fit right now: ${fit} at resume score ${c.score ?? 0}. ${stay ? "Stay the course: your skills already point here." : `Your lines lean ${fit}: score this same resume on that track before switching.`} Cheapest test either way: one weekend logbook entry in ${c.top || "your top gap"}.`;
  }
  if (actionId === "review") return reviewWriteup(s);
  if (actionId === "match") return matchWriteup(c.found, c.topJob);
  if (actionId === "cover") return coverLetter(s);
  if (actionId === "mentor") {
    const gap = c.top || "your top gap";
    if (c.ayush) return `Mentorship track for ${gap}: (1) workshop: pick one NCISM or RAV hands-on CME this semester; (2) guest-lecture question: ask one working vaidya "what broke last week and how did you find it"; (3) live posting: assist one ${gap} case series in 2 weekends with a proof link, then re-score. Faculty board (/faculty) lists the real seats; this loop is the warm-up.`;
    return `Mentorship track for ${gap}: (1) workshop: join one Git & GitHub or mock-interview weekend this month; (2) senior question: ask one working engineer "what broke last week and how did you find it"; (3) live brief: ship one ${gap} mini-project in 2 weekends with a proof link, then re-score. Faculty board (/faculty) lists the real seats; this loop is the warm-up.`;
  }
  if (actionId === "bams") {
    if (c.ayush) return HI(
      `BAMS deepen: your path from beej to acharya:\n1. SHISHIKSHA orientation (6 days, NCISM mandatory): finish the checklist in /quests.\n2. Rotatory internship: months 1-6 college hospital (OPD/IPD, case sheets), months 7-12 PHC/rural.\n3. Pick a lane: clinical practice, CCRAS research (SPARK/JRF), or industry GMP/QA.\n4. Close your top gap (${c.top || "none detected"}) with one quest pair plus proof link.\nReadiness now: ${c.score ?? 0}/100. Target 65+ for Gold.`,
      `BAMS गहराई: बीज से आचार्य तक:\n1. शिशिक्षा ओरिएंटेशन (6 दिन, NCISM अनिवार्य): /quests में चेकलिस्ट पूरी करें।\n2. रोटेटरी इंटर्नशिप: 1-6 महीना कॉलेज अस्पताल (OPD/IPD, केस शीट), 7-12 महीना PHC/ग्रामीण।\n3. लाइन चुनें: क्लीनिकल प्रैक्टिस, CCRAS रिसर्च (SPARK/JRF), या GMP/QA इंडस्ट्री।\n4. टॉप गैप (${c.top || "कोई नहीं"}) एक क्वेस्ट + प्रूफ लिंक से बंद करें।\nअभी readiness: ${c.score ?? 0}/100। 65+ Gold के लिए लक्ष्य।`
    )(s.lang);
    return "BAMS deepen is for the Ayush Professional track. Switch your track on /resume to unlock clinical path coaching.";
  }
  if (actionId === "roadmap") {
    if (!c.ayush) {
      const lvl = c.score >= 65 ? "L3 Associate" : c.score >= 50 ? "L2 Trainee" : c.score >= 30 ? "L1 Intern" : "L0 Explorer";
      return `Engineering ladder from readiness ${c.score ?? 0}/100 (you read as ${lvl}):\nL0 Explorer → score + first quest pair.\nL1 Intern (30+) → eligible for internships; close ${c.top || "your top gap"}.\nL2 Trainee (50+) → apply broadly; interview prep next.\nL3 Associate (65+) → job-ready; portfolio plus referrals.\nL4 Professional (80+) → mentor others.\nL5 Expert (90+) → lead.\nCheapest step this week: one quest pair in ${c.top || "your top gap"} with a proof link, then re-score. Your board: /quests.`;
    }
    return "Level-up roadmap is for the Tech portal. Switch your track on /resume to unlock the L0–L5 ladder coaching.";
  }
  if (actionId === "addjob") {
    return "Paste the job posting as your next message starting with PASTE: (include Company:, Title:, Location: lines if you can). I'll parse it and show a confirm card: nothing saves until you press Confirm.";
  }
  if (actionId === "ask") return askAnswer(ctx(s), s);
  return "I did not catch that. Ask about a skill, an internship, your score, or tap a shortcut below.";
}

// free-text, answered from their own data — no key needed. The AI upgrade
// (when keyed) deepens this, never replaces it.
function askAnswer(c, s = {}) {
  const q = String(s.question || "").toLowerCase();
  const has = (...words) => words.some((w) => q.includes(w));
  const all = [...c.found, ...c.missing];
  const skill = all.find((sk) => sk && q.includes(String(sk).toLowerCase()));
  if (skill) {
    const known = c.found.some((f) => String(f).toLowerCase() === String(skill).toLowerCase());
    const numbers = c.ayush ? "cases, sittings, records" : "users, %, tests written";
    return known
      ? `${skill} is on your resume (score ${c.score ?? 0}). To defend it in an interview: one place you used it, one number (${numbers}). Add that line and re-score — numbers lift the result dimension.`
      : `${skill} is your gap: it is missing from your resume and postings ask for it. Fastest close: open Quests, finish the ${skill} pair, link one proof, re-score. One pair typically moves readiness.`;
  }
  if (has("intern", "job", "apply", "hospital", "vacan")) {
    return c.jobTitle
      ? `Closest match right now: ${c.jobTitle} at ${c.jobCompany} (needs ${c.jobSkills.join(", ") || "role skills"}). Open Internships, check the eligible chip, mark applied — it enters your pipeline.`
      : "Open Internships: eligible roles sort first, ranked by the skills on your resume. Save three, apply to one.";
  }
  if (has("score", "resume", "ats", "improve", "fix")) {
    return `Your resume scores ${c.score ?? 0}. Highest-leverage fix: ${c.top ? `add ${c.top} with one proof link` : "add one number per bullet"}. The Improve tab lists each fix in order.`;
  }
  if (has("interview", "question", "round", "hr")) {
    if (c.ayush) return "Clinical rounds test case presentation: complaint, examination, intervention, outcome — with one number. The Interview tab asks 5 questions built from your skills and grades each 0-4.";
    return "Tech interviews test STAR plus numbers: open with the Result, keep each answer under 3 sentences, name one tool the role expects. The Interview tab asks 5 questions built from your resume and grades each 0-4.";
  }
  if (has("quest", "learn", "course", "study")) {
    return `Your next quest is ${c.top || "in the quest list"}: one free course plus one proof-sized task. Finish the pair and your readiness moves the same day.`;
  }
  if (has("certificate", "certificat")) {
    if (c.ayush) return "Free certs that count: SWAYAM pharma quality (GMP), NPTEL Ayurveda Biology, ABDM digital health basics. Each completed pair with proof lifts score and unlocks postings.";
    return "Free certs that count: freeCodeCamp web design + JavaScript, NPTEL databases/SQL, Google Digital Garage SEO. Each completed pair with proof lifts score and unlocks postings.";
  }
  if (has("stipend", "salary", "pay", "sarkari", "government")) {
    if (c.ayush) return "Paid BAMS starts: JRF Pharmacy (Rs.37,000+HRA), SPARK studentship (Rs.50,000), QA/GMP trainee roles (~Rs.10,000/month). Ministry internships pay in certificate. All are in your feed with stipends listed.";
    return "Paid tech starts: frontend/backend internships (Rs.8,000–25,000/month), data internships, SIH prize tracks. Stipends are listed on each posting in your feed — filter eligible first, then apply.";
  }
  if (has("hello", "hi", "hey", "namaste")) {
    return `Namaste. I can see your score (${c.score ?? 0}), your gaps (${c.missing.join(", ") || "none"}), and your lane. Ask about any of them.`;
  }
  if (has("roadmap", "ladder", "level up", "l0", "l1", "l2", "l3", "l4", "l5")) return localAnswer("roadmap", s);
  if (has("bams deepen", "beej", "acharya", "vaidya path")) return localAnswer("bams", s);
  return `Good question. From your data: score ${c.score ?? 0}, biggest gap ${c.top || "none"}, lane ${c.profileLine || "not set"}. Ask about a skill, an internship, or your score — or tap a shortcut and I will go deeper.`;
}
