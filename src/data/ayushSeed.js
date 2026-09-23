// Ayush-seeded data: BAMS roles, jobs, quiz, interview, questionnaire, syllabus, roadmap.
// Ministry of Ayush · SIH 26044 · NCISM-aligned

export const AYUSH_ENABLED =
  (import.meta?.env?.VITE_AYUSH || "on").toLowerCase() !== "off";

export const AYUSH_ROLE = {
  label: "Ayush Professional",
  skills: ["dravyaguna", "panchakarma", "diagnosis", "documentation", "gmp", "pharmacovigilance", "hims", "research", "pharmacy", "sanskrit"],
  keywords: ["bams", "ayurveda", "herbal", "vaidya", "clinical", "panchakarma", "gmp", "internship", "ncism", "shishiksha"],
};

export const AYUSH_JOBS = [
  { id: 201, role: "ayush", title: "BAMS Rotatory Intern", company: "Govt. Ayurveda Hospital", loc: "Pan India", type: "Internship", skills: ["diagnosis", "documentation", "panchakarma"], minScore: 30, apply: "https://ncismindia.org/" },
  { id: 202, role: "ayush", title: "Clinical Research Associate (Ayush)", company: "Herbal Pharma R&D", loc: "Pune", type: "Internship", skills: ["research", "documentation", "pharmacovigilance"], minScore: 55, apply: "https://www.ccras.nic.in/" },
  { id: 203, role: "ayush", title: "Herbal QA Trainee (GMP)", company: "ASU Drug Manufacturer", loc: "Indore", type: "Full-time", skills: ["gmp", "dravyaguna", "pharmacy"], minScore: 50, apply: "https://ayush.gov.in/" },
  { id: 204, role: "ayush", title: "Panchakarma Assistant", company: "NABH Ayurveda Hospital", loc: "Kerala", type: "Internship", skills: ["panchakarma", "diagnosis", "documentation"], minScore: 35, apply: "https://internshala.com/internships/ayurveda-internship/" },
  { id: 205, role: "ayush", title: "Wellness Tourism Coordinator", company: "Wellness Retreat", loc: "Rishikesh", type: "Full-time", skills: ["panchakarma", "documentation", "sanskrit"], minScore: 40, apply: "https://ayush.gov.in/" },
  { id: 206, role: "ayush", title: "Medicinal Plant Cultivation Associate", company: "NMPB Farm Cluster", loc: "Madhya Pradesh", type: "Govt", skills: ["dravyaguna", "pharmacy", "documentation"], minScore: 30, apply: "https://www.nmpb.nic.in/" },
  { id: 207, role: "ayush", title: "AYUSH Internship Programme 2026", company: "Ministry of Ayush", loc: "New Delhi", type: "Internship", skills: ["documentation", "research", "hims"], minScore: 35, apply: "https://ayush.gov.in/", stipend: "unpaid · certificate", deadline: "rolling, 30 days before joining", kind: "ministry" },
  { id: 208, role: "ayush", title: "Junior Research Fellow (Pharmacy)", company: "NARIP Cheruthuruthy, CCRAS", loc: "Kerala", type: "Full-time", skills: ["research", "pharmacy", "documentation"], minScore: 60, apply: "https://ccras.nic.in/", stipend: "₹37,000 + HRA", deadline: "walk-in, see CCRAS vacancies", kind: "research" },
  { id: 209, role: "ayush", title: "SPARK UG Research Studentship", company: "CCRAS", loc: "Pan India", type: "Govt", skills: ["research", "documentation", "diagnosis"], minScore: 45, apply: "https://ccras.nic.in/", stipend: "₹50,000 scholarship", deadline: "via college guide", kind: "research" },
  { id: 210, role: "ayush", title: "Panchakarma Technician Course", company: "CCRAS Training Centres", loc: "Delhi / Kerala / Jammu / Guwahati", type: "Govt", skills: ["panchakarma", "diagnosis"], minScore: 25, apply: "https://ccras.nic.in/", stipend: "self-financed · 65 seats", deadline: "31 jul cycle", kind: "training" },
  { id: 211, role: "ayush", title: "OPD Vaidya (Fresher)", company: "NABH Ayurveda Hospital", loc: "Jaipur", type: "Full-time", skills: ["diagnosis", "documentation", "sanskrit"], minScore: 40, apply: "https://internshala.com/internships/ayurveda-internship/" },
  { id: 212, role: "ayush", title: "Ayurvedic Pharmacopoeia Trainee", company: "ASU Drug Testing Lab", loc: "Ghaziabad", type: "Internship", skills: ["gmp", "pharmacy", "research"], minScore: 50, apply: "https://ayush.gov.in/" },
];

export const AYUSH_TREE = {
  ayush: {
    label: "Ayush Professional",
    branches: [
      {
        id: "clinical",
        name: "Clinical Foundations",
        skills: [
          { id: "dravyaguna", name: "Dravyaguna", course: { t: "Ayurveda Biology (NPTEL)", u: "https://swayam.gov.in/" }, project: "20-plant herbarium with latin names + uses, photographed" },
          { id: "diagnosis", name: "Rognidan Basics", course: { t: "NCISM Competency Modules", u: "https://ncismindia.org/" }, project: "10 OPD case sheets written in standard format, anonymized" },
          { id: "panchakarma", name: "Panchakarma Protocols", course: { t: "RAV CME: Panchakarma", u: "https://ayush.gov.in/" }, project: "Snehana-Swedana procedure log from 5 supervised sittings" },
        ],
      },
      {
        id: "industry",
        name: "Industry Readiness",
        skills: [
          { id: "gmp", name: "GMP for ASU Drugs", course: { t: "SWAYAM Pharma Quality (free cert)", u: "https://swayam.gov.in/" }, project: "1-page GMP gap note for a college pharmacy unit" },
          { id: "hims", name: "HIMS + E-Logbook", course: { t: "ABDM Digital Health Basics", u: "https://abdm.gov.in/" }, project: "Digital logbook: 15 cases entered in a spreadsheet template" },
          { id: "shishiksha", name: "SHISHIKSHA Orientation", course: { t: "Bench-to-Bedside 6-day Module (NCISM)", u: "https://ncismindia.org/" }, project: "Orientation checklist: NABH, ethics, documentation, HIMS — all 6 days signed" },
        ],
      },
    ],
  },
};

export const AYUSH_COURSES = {
  dravyaguna: [{ t: "Ayurveda Biology — NPTEL (free cert)", u: "https://swayam.gov.in/", c: true }],
  panchakarma: [{ t: "RAV CME: Panchakarma Practice", u: "https://ayush.gov.in/" }],
  diagnosis: [{ t: "NCISM Competency Modules", u: "https://ncismindia.org/" }],
  documentation: [{ t: "SHISHIKSHA Case-Sheet Module (NCISM)", u: "https://ncismindia.org/" }],
  gmp: [{ t: "SWAYAM Pharma Quality (free cert)", u: "https://swayam.gov.in/", c: true }],
  pharmacovigilance: [{ t: "PvPI ADR Reporting Basics", u: "https://www.ipc.gov.in/" }],
  hims: [{ t: "ABDM Digital Health Basics", u: "https://abdm.gov.in/" }],
  research: [{ t: "CCRAS Research Orientation", u: "https://www.ccras.nic.in/" }],
  pharmacy: [{ t: "Bhaishajya Kalpana — SWAYAM", u: "https://swayam.gov.in/" }],
  sanskrit: [{ t: "Sanskrit for Ayurveda — SWAYAM (free cert)", u: "https://swayam.gov.in/", c: true }],
};

export const AYUSH_PROJECT_IDEAS = [
  "20-plant herbarium with latin names + documented uses",
  "GMP gap note for the college pharmacy unit, 1 page",
  "SHISHIKSHA 6-day orientation checklist, fully signed",
];

export const AYUSH_QUIZ = [
  { q: "Tridosha comprises which three doshas?", opts: ["Vata Pitta Kapha", "Satva Rajas Tamas", "Prana Apana Vyana", "Dhatu Mala Agni"], ans: 0 },
  { q: "Dravyaguna primarily studies what?", opts: ["Surgery", "Medicinal substances", "Astrology", "Hospital design"], ans: 1 },
  { q: "Which is a Panchakarma procedure?", opts: ["Vamana", "Vaccination", "Dialysis", "Biopsy"], ans: 0 },
  { q: "GMP in drug manufacturing stands for?", opts: ["Good Marketing Practice", "Good Manufacturing Practice", "General Medical Protocol", "Graded Medicine Plan"], ans: 1 },
  { q: "NCISM regulates which systems?", opts: ["Only modern medicine", "Ayurveda Unani Siddha Sowa-Rigpa", "Only homeopathy", "Only nursing"], ans: 1 },
  { q: "Charaka Samhita is a foundational text of?", opts: ["Yoga", "Ayurveda", "Siddha", "Unani"], ans: 1 },
  { q: "NABH accreditation relates to?", opts: ["Hospital quality", "Drug pricing", "Crop yield", "Export duty"], ans: 0 },
  { q: "SHISHIKSHA is whose internship orientation programme?", opts: ["MCI", "NCISM", "UGC", "NMC"], ans: 1 },
  { q: "Pharmacovigilance tracks what?", opts: ["Adverse drug reactions", "Pharmacy profits", "Herb exports", "OPD footfall"], ans: 0 },
  { q: "Compulsory BAMS rotatory internship lasts?", opts: ["6 months", "12 months", "3 months", "24 months"], ans: 1 },
];

export const AYUSH_INTERVIEW_QS = [
  "Take a furnished OPD case: how do you write the Rogi-Roga Pariksha in 5 lines?",
  "Snehana before Vamana — why this order? 30-sec answer.",
  "A batch fails GMP organoleptic check. Your first 3 steps?",
  "How do you document an adverse event for pharmacovigilance?",
  "Why Ayush clinical research, not just practice? 30-sec answer.",
];

export const AYUSH_QUESTIONNAIRE = [
  { id: "level", text: "How would you describe yourself?", type: "choice", options: ["BAMS student", "Intern", "Practitioner"] },
  { id: "clinical", text: "Have you assisted in real OPD/IPD procedures?", type: "yesno" },
  { id: "clinical-what", text: "Which procedures, and where?", type: "text", showIf: { id: "clinical", value: "yes" } },
  { id: "top-skills", text: "Your top 3 ayush skills, comma separated", type: "text" },
];

export const AYUSH_FDPS = [
  { id: "a1", kind: "workshop", title: "SHISHIKSHA: Bench-to-Bedside Internship Orientation", org: "NCISM", loc: "Pan India", url: "https://ncismindia.org/", deadline: "2026-10-01" },
  { id: "a2", kind: "fdp", title: "RAV CME: Dravyaguna Teaching Methods", org: "Rashtriya Ayurveda Vidyapeeth", loc: "New Delhi", url: "https://ayush.gov.in/", deadline: "2026-11-12" },
  { id: "a3", kind: "faculty-internship", title: "Industry Immersion: GMP Herbal Manufacturing", org: "ASU Pharma Cluster", loc: "Indore", url: "https://ayush.gov.in/", deadline: "2026-10-30" },
  { id: "a4", kind: "consultancy", title: "NABH Accreditation Consultancy, Ayurveda Hospitals", org: "Ministry of Ayush Network", loc: "Pan India", url: "https://ayush.gov.in/", deadline: "2026-12-15" },
  { id: "a5", kind: "workshop", title: "E-Logbook + HIMS Hands-on for Interns", org: "NCISM Digital Cell", loc: "Online", url: "https://ncismindia.org/", deadline: "2026-11-08" },
];

// BAMS curriculum: semester-wise skills mapped to NCISM competencies
export const AYUSH_SYLLABUS = [
  { sem: "Sem 1", label: "Part I — Basic Sciences", skills: ["anatomy", "physiology", "sanskrit", "padarth"], courses: 8, quests: 4 },
  { sem: "Sem 2", label: "Part I — Basic Sciences (cont.)", skills: ["pharmacology", "botany", "sanskrit"], courses: 7, quests: 4 },
  { sem: "Sem 3", label: "Part II — Rogganitas", skills: ["diagnosis", "pathology", "surgery-basics", "documentation"], courses: 9, quests: 5 },
  { sem: "Sem 4", label: "Part III — Kriya Sharira", skills: ["panchakarma", "pharmacology", "diagnosis"], courses: 8, quests: 4 },
  { sem: "Sem 5", label: "Part IV — Ras Shastra", skills: ["pharmacy", "gmp", "pharmacovigilance", "research"], courses: 7, quests: 4 },
  { sem: "Sem 6", label: "Part IV — Ras Shastra (cont.)", skills: ["pharmacy", "gmp", "surgery-basics", "documentation"], courses: 7, quests: 4 },
  { sem: "Sem 7", label: "Rotatory Internship (6 mo)", skills: ["diagnosis", "panchakarma", "documentation", "hims", "shishiksha"], courses: 4, quests: 6 },
  { sem: "Sem 8", label: "Rotatory Internship (6 mo)", skills: ["pharmacovigilance", "research", "hims", "gmp"], courses: 4, quests: 6 },
];

// Learning-path stages per skill family
export const AYUSH_ROADMAP_STAGES = {
  clinical: { label: "Clinical Foundations", skills: ["dravyaguna", "diagnosis", "panchakarma"], path: "case-log", provider: "NCISM Competency Modules + college hospital", hours: 180 },
  industry: { label: "Industry Readiness", skills: ["gmp", "pharmacy", "pharmacovigilance", "research"], path: "certificate", provider: "SWAYAM + CCRAS research orientation", hours: 120 },
  digital: { label: "Digital Health", skills: ["hims", "documentation", "shishiksha"], path: "orientation", provider: "ABDM Digital Health + NCISM e-logbook", hours: 40 },
  classical: { label: "Classical Foundations", skills: ["sanskrit", "pharmacology", "botany"], path: "course", provider: "SWAYAM Ayurveda + Sanskrit for Ayurveda", hours: 80 },
};