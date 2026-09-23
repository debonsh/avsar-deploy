// Ayurveda-only opportunity feed: internships first, then fresher jobs.
// Same shape as before ({id, role, title, company, loc, type, skills, minScore, apply, stipend?, deadline?, kind?})
// so matchJobs, the pipeline, and eligibility keep working untouched.
// The tech portal's curated feed is TECH_JOBS below — ids 301+ so the two
// portals can be merged into one pipeline view without a posting shadowing another.
export const JOBS = [
  { id: 1, role: "ayush", title: "BAMS Rotatory Intern (OPD/IPD)", company: "Govt. Ayurveda Medical College Hospital", loc: "Pan India", type: "Internship", skills: ["diagnosis", "documentation", "panchakarma"], minScore: 30, apply: "https://ncismindia.org/", stipend: "stipend as per NCISM norms", deadline: "through college internship cell" },
  { id: 2, role: "ayush", title: "Panchakarma Therapy Intern", company: "NABH Ayurveda Hospital", loc: "Kochi", type: "Internship", skills: ["panchakarma", "diagnosis", "documentation"], minScore: 35, apply: "https://internshala.com/internships/ayurveda-internship/", stipend: "₹8,000–12,000/month", deadline: "rolling" },
  { id: 3, role: "ayush", title: "Clinical Research Intern (Ayush)", company: "CCRAS Peripheral Institute", loc: "New Delhi", type: "Internship", skills: ["research", "documentation", "pharmacovigilance"], minScore: 50, apply: "https://ccras.nic.in/", stipend: "contingency + certificate", deadline: "walk-in, see CCRAS vacancies", kind: "research" },
  { id: 4, role: "ayush", title: "Herbal QA & GMP Intern", company: "ASU Drug Manufacturer", loc: "Indore", type: "Internship", skills: ["gmp", "dravyaguna", "pharmacy"], minScore: 45, apply: "https://ayush.gov.in/", stipend: "₹10,000/month", deadline: "rolling" },
  { id: 5, role: "ayush", title: "AYUSH Internship Programme 2026", company: "Ministry of Ayush", loc: "New Delhi", type: "Internship", skills: ["documentation", "research", "hims"], minScore: 35, apply: "https://ayush.gov.in/", stipend: "certificate", deadline: "30 days before joining", kind: "ministry" },
  { id: 6, role: "ayush", title: "Pharmacopoeia Lab Intern", company: "ASU Drug Testing Lab", loc: "Ghaziabad", type: "Internship", skills: ["gmp", "pharmacy", "research"], minScore: 50, apply: "https://ayush.gov.in/", stipend: "as per lab norms", deadline: "rolling" },
  { id: 7, role: "ayush", title: "OPD Vaidya (Fresher)", company: "NABH Ayurveda Hospital", loc: "Jaipur", type: "Full-time", skills: ["diagnosis", "documentation", "sanskrit"], minScore: 40, apply: "https://internshala.com/internships/ayurveda-internship/" },
  { id: 8, role: "ayush", title: "Junior Research Fellow (Ayurveda Pharmacy)", company: "NARIP Cheruthuruthy, CCRAS", loc: "Kerala", type: "Full-time", skills: ["research", "pharmacy", "documentation"], minScore: 60, apply: "https://ccras.nic.in/", stipend: "₹37,000 + HRA", deadline: "walk-in, see CCRAS vacancies", kind: "research" },
  { id: 9, role: "ayush", title: "Wellness Physician (Panchakarma Resort)", company: "Wellness Retreat Chain", loc: "Rishikesh", type: "Full-time", skills: ["panchakarma", "diagnosis", "documentation"], minScore: 40, apply: "https://ayush.gov.in/" },
  { id: 10, role: "ayush", title: "Medicinal Plants Cultivation Associate", company: "NMPB Farm Cluster", loc: "Madhya Pradesh", type: "Govt", skills: ["dravyaguna", "pharmacy", "documentation"], minScore: 30, apply: "https://www.nmpb.nic.in/" },
  { id: 11, role: "ayush", title: "SPARK UG Research Studentship", company: "CCRAS", loc: "Pan India", type: "Govt", skills: ["research", "documentation", "diagnosis"], minScore: 45, apply: "https://ccras.nic.in/", stipend: "₹50,000 scholarship", deadline: "via college guide", kind: "research" },
  { id: 12, role: "ayush", title: "Panchakarma Technician Course (65 seats)", company: "CCRAS Training Centres", loc: "Delhi / Kerala / Jammu / Guwahati", type: "Govt", skills: ["panchakarma", "diagnosis"], minScore: 25, apply: "https://ccras.nic.in/", stipend: "self-financed", deadline: "31 jul cycle", kind: "training" },
];

// Tech portal curated feed: one posting per lane, picked so a fresher with a
// finished quest pair can actually clear the bar. Ported from the earlier tech build.
export const TECH_JOBS = [
  { id: 301, role: "sde", title: "Frontend Intern", company: "ZetaPay (Startup)", loc: "Remote", type: "Internship", skills: ["javascript", "react", "html", "css", "git"], minScore: 40, apply: "https://internshala.com/internships/front-end-development-internship/" },
  { id: 302, role: "sde", title: "Backend Trainee", company: "TCS Ninja (Off-campus)", loc: "Pan India", type: "Full-time", skills: ["python", "sql", "api", "git", "dsa"], minScore: 55, apply: "https://www.naukri.com/it-jobs" },
  { id: 303, role: "sde", title: "Full-Stack Junior", company: "Freshworks", loc: "Chennai", type: "Full-time", skills: ["javascript", "react", "node", "sql", "api"], minScore: 70, apply: "https://www.linkedin.com/jobs/search/?keywords=junior%20full%20stack" },
  { id: 304, role: "data", title: "Data Analyst Intern", company: "Swiggy Analytics", loc: "Bangalore", type: "Internship", skills: ["python", "sql", "excel", "visualization"], minScore: 40, apply: "https://internshala.com/internships/data-analytics-internship/" },
  { id: 305, role: "data", title: "BI Associate", company: "Flipkart", loc: "Bangalore", type: "Full-time", skills: ["sql", "tableau", "excel", "statistics", "power bi"], minScore: 65, apply: "https://www.naukri.com/data-analyst-jobs" },
  { id: 306, role: "data", title: "Reporting Analyst", company: "HDFC Bank", loc: "Mumbai", type: "Full-time", skills: ["excel", "sql", "report", "statistics"], minScore: 55, apply: "https://www.linkedin.com/jobs/search/?keywords=data%20analyst" },
  { id: 307, role: "marketing", title: "Content Intern", company: "boAt", loc: "Remote", type: "Internship", skills: ["content", "social media", "copywriting", "canva"], minScore: 35, apply: "https://internshala.com/internships/content-writing-internship/" },
  { id: 308, role: "marketing", title: "SEO Executive", company: "Zerodha", loc: "Bangalore", type: "Full-time", skills: ["seo", "analytics", "content", "ads"], minScore: 60, apply: "https://www.naukri.com/seo-jobs" },
  { id: 309, role: "govt", title: "SSC CGL Assistant", company: "Govt. of India", loc: "Pan India", type: "Govt", skills: ["gk", "reasoning", "quant", "english"], minScore: 30, apply: "https://ssc.gov.in/" },
  { id: 310, role: "govt", title: "IBPS Clerk", company: "Public Sector Banks", loc: "Pan India", type: "Govt", skills: ["reasoning", "quant", "english", "current affairs"], minScore: 30, apply: "https://www.ibps.in/" },
  { id: 311, role: "govt", title: "UPSC CSE (Foundation)", company: "Govt. of India", loc: "Delhi", type: "Govt", skills: ["polity", "history", "current affairs", "gk"], minScore: 30, apply: "https://upsc.gov.in/" },
  { id: 312, role: "sde", title: "Apprentice (NATS)", company: "Govt. Apprenticeship", loc: "Pan India", type: "Govt", skills: ["python", "sql", "git"], minScore: 35, apply: "https://nats.education.gov.in/" },
];

export function matchJobs(role, score, foundSkills = [], jobs = JOBS) {
  const found = new Set(foundSkills.map((s) => s.toLowerCase()));
  return jobs.filter((j) => j.role === role)
    .map((j) => ({
      ...j,
      matched: j.skills.filter((s) => found.has(s.toLowerCase())).length,
      eligible: score >= j.minScore,
    }))
    .sort((a, b) => (b.eligible - a.eligible) || (b.matched - a.matched));
}
