// skill-tree per scoring lane: classroom → clinic/career.
// "meaningful" = pair-gated (course AND project both required), skill completion feeds back into ATS.
import { AYUSH_TREE } from "../ayush/seed.js";

const UPSKILL_BRANCHES = [
  {
    id: "rotatory",
    name: "Rotatory Internship",
    skills: [
      { id: "shishiksha", name: "SHISHIKSHA Orientation", course: { t: "Bench-to-Bedside 6-day Module (NCISM)", u: "https://ncismindia.org/" }, project: "Orientation checklist: NABH, ethics, documentation, HIMS — all 6 days signed" },
      { id: "elogbook", name: "E-Logbook Discipline", course: { t: "ABDM Digital Health Basics", u: "https://abdm.gov.in/" }, project: "Digital logbook: 15 cases entered in a spreadsheet template" },
      { id: "caselog", name: "Case Presentation", course: { t: "NCISM Competency Modules", u: "https://ncismindia.org/" }, project: "Present 3 OPD cases to your unit head, log feedback" },
    ],
  },
  {
    id: "career",
    name: "First Job Ready",
    skills: [
      { id: "resume", name: "Vaidya Resume", course: { t: "SHISHIKSHA Case-Sheet Module (NCISM)", u: "https://ncismindia.org/" }, project: "Add 3 quantified clinical outcomes to your resume, re-score above 60" },
      { id: "apply", name: "First 5 Applications", course: { t: "Ayush internship listings", u: "https://internshala.com/internships/ayurveda-internship/" }, project: "Apply to 5 ayush internships, track response rate in a sheet" },
      { id: "pharmacovig", name: "Pharmacovigilance Proof", course: { t: "PvPI ADR Reporting Basics", u: "https://www.ipc.gov.in/" }, project: "File 1 mock ADR report in PvPI format, link it as proof" },
    ],
  },
];

// tech portal trees: 4 branches per lane, chained classroom → proof → application.
// Ported from the earlier tech build so both portals keep their own seed, untouched by each other.
const TECH_TREES = {
  sde: {
    label: "Software Developer",
    branches: [
      {
        id: "lang",
        name: "Languages & Logic",
        skills: [
          { id: "js", name: "JavaScript", course: { t: "freeCodeCamp JS", u: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/" }, project: "Reverse-a-string CLI in Node. Push to GitHub" },
          { id: "python", name: "Python", course: { t: "Python for Everybody (NPTEL)", u: "https://swayam.gov.in/" }, project: "CSV cleaner script with argparse + 5 sample inputs" },
          { id: "dsa", name: "DSA", course: { t: "Striver A2Z (free)", u: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/" }, project: "Solve 30 array+string problems, log time/space complexity" },
        ],
      },
      {
        id: "web",
        name: "Web Stack",
        skills: [
          { id: "html", name: "HTML/CSS", course: { t: "freeCodeCamp Responsive Web", u: "https://www.freecodecamp.org/learn/responsive-web-design/" }, project: "Personal portfolio site, deploy on Vercel/GitHub Pages" },
          { id: "react", name: "React", course: { t: "React Official Tutorial (free)", u: "https://react.dev/learn" }, project: "Todo app with localStorage, deployed on Vercel" },
          { id: "api", name: "REST APIs", course: { t: "REST APIs — freeCodeCamp", u: "https://www.youtube.com/watch?v=-MTSQjw5DrM" }, project: "Public-API aggregator (GitHub + weather) with React" },
        ],
      },
      {
        id: "backend",
        name: "Backend & Data",
        skills: [
          { id: "node", name: "Node.js", course: { t: "Node.js Crash Course", u: "https://www.youtube.com/watch?v=fBNz5xF-Kx4" }, project: "Express CRUD API with SQLite, README + Postman collection" },
          { id: "sql", name: "SQL", course: { t: "SQLBolt (free, 1 hr)", u: "https://sqlbolt.com/" }, project: "10 queries on an open e-commerce DB, published on GitHub" },
          { id: "git", name: "Git & GitHub", course: { t: "Git Handbook (free)", u: "https://guides.github.com/introduction/git-handbook/" }, project: "Contribute 3 PRs to any open-source repo (typo or docs count)" },
        ],
      },
      {
        id: "ship",
        name: "Ship & Get Hired",
        skills: [
          { id: "deploy", name: "Deploy & CI", course: { t: "Vercel Docs (free)", u: "https://vercel.com/docs" }, project: "Deploy 1 project with GitHub Actions CI, show deploy URL" },
          { id: "resume", name: "Resume Refresh", course: { t: "freeCodeCamp Job Prep", u: "https://www.freecodecamp.org/learn/job-ready/" }, project: "Add 3 numbers to resume bullets, re-upload, score rises" },
          { id: "apply", name: "First 5 Applications", course: { t: "Internshala SDE", u: "https://internshala.com/internships/computer-science-internship/" }, project: "Apply to 5 SDE internships, track response rate in a sheet" },
        ],
      },
    ],
  },
  data: {
    label: "Data Analyst",
    branches: [
      {
        id: "fund",
        name: "Data Foundations",
        skills: [
          { id: "sql", name: "SQL", course: { t: "SQLBolt (free, 1 hr)", u: "https://sqlbolt.com/" }, project: "10 queries on e-commerce DB, GitHub README" },
          { id: "excel", name: "Excel", course: { t: "Excel for Analysts (NPTEL)", u: "https://swayam.gov.in/" }, project: "Pivot-table summary of any open dataset, screenshot PDF" },
          { id: "stats", name: "Statistics", course: { t: "Khan Academy Statistics", u: "https://www.khanacademy.org/math/statistics-probability" }, project: "Mean/median writeup on 1 real-world dataset" },
        ],
      },
      {
        id: "python",
        name: "Python for Data",
        skills: [
          { id: "python", name: "Python", course: { t: "Python for Everybody (NPTEL)", u: "https://swayam.gov.in/" }, project: "CSV cleaner script, 5 sample inputs in repo" },
          { id: "pandas", name: "Pandas", course: { t: "Kaggle Pandas (free)", u: "https://www.kaggle.com/learn/pandas" }, project: "Notebook analyzing IPL/Swiggy-style public CSV" },
          { id: "viz", name: "Visualization", course: { t: "freeCodeCamp Data Analysis", u: "https://www.freecodecamp.org/learn/data-analysis-with-python/" }, project: "5 charts from one dataset, push notebook to GitHub" },
        ],
      },
      {
        id: "bi",
        name: "BI Tools",
        skills: [
          { id: "powerbi", name: "Power BI", course: { t: "MS Power BI Guided (free)", u: "https://learn.microsoft.com/en-us/training/paths/power-bi-fundamentals/" }, project: "IPL dashboard with 3 insights, publish .pbix + screenshots" },
          { id: "tableau", name: "Tableau", course: { t: "Tableau Free Training", u: "https://www.tableau.com/learn/training" }, project: "Sales dashboard on public Tableau Public" },
        ],
      },
      {
        id: "ship",
        name: "Ship & Get Hired",
        skills: [
          { id: "report", name: "Insight Report", course: { t: "Google Data Analytics (free)", u: "https://www.coursera.org/professional-certificates/google-data-analytics" }, project: "1-page written insight report for a public dataset" },
          { id: "portfolio", name: "Portfolio", course: { t: "GitHub Pages (free)", u: "https://pages.github.com/" }, project: "Portfolio page linking 3 projects, deploy as site" },
          { id: "apply", name: "First 5 Applications", course: { t: "Internshala Data Analytics", u: "https://internshala.com/internships/data-analytics-internship/" }, project: "Apply to 5 DA internships, track responses" },
        ],
      },
    ],
  },
  marketing: {
    label: "Marketing Associate",
    branches: [
      {
        id: "write",
        name: "Content & Copy",
        skills: [
          { id: "copy", name: "Copywriting", course: { t: "HubSpot Content Marketing (free cert)", u: "https://academy.hubspot.com/courses/content-marketing" }, project: "Write 5 LinkedIn posts for a local business" },
          { id: "seo", name: "SEO Basics", course: { t: "Ahrefs SEO Course (free)", u: "https://ahrefs.com/academy/seo-training-course" }, project: "SEO audit of your college site, 2-page fix report" },
          { id: "email", name: "Email Marketing", course: { t: "Mailchimp Email Marketing (free)", u: "https://mailchimp.com/learn/" }, project: "Send 1 real campaign to 20 friends, track opens/clicks" },
        ],
      },
      {
        id: "social",
        name: "Social & Ads",
        skills: [
          { id: "smm", name: "Social Media", course: { t: "Meta Blueprint (free)", u: "https://www.facebookblueprint.com/" }, project: "Run a 7-day meme page, log reach in a sheet" },
          { id: "ads", name: "Paid Ads", course: { t: "Google Ads Free Training", u: "https://skillshop.withgoogle.com/" }, project: "Set up a mock ₹500 Meta ad in Ads Manager, screenshot metrics" },
          { id: "canva", name: "Canva", course: { t: "Canva Design School (free)", u: "https://www.canva.com/designschool/" }, project: "5 post templates for a niche, share publicly" },
        ],
      },
      {
        id: "analytics",
        name: "Analytics",
        skills: [
          { id: "ga4", name: "GA4", course: { t: "Google Analytics Academy", u: "https://analytics.google.com/analytics/academy/" }, project: "GA4 demo account + 1 custom report PDF" },
          { id: "metrics", name: "Metrics That Matter", course: { t: "HubSpot Inbound (free)", u: "https://academy.hubspot.com/" }, project: "Pick a campaign, define 3 KPIs, justify them in 1 page" },
        ],
      },
      {
        id: "ship",
        name: "Ship & Get Hired",
        skills: [
          { id: "portfolio", name: "Portfolio", course: { t: "Notion Portfolio Template", u: "https://www.notion.so/templates" }, project: "3 campaigns in a Notion page, public link" },
          { id: "resume", name: "Resume Refresh", course: { t: "freeCodeCamp Job Prep", u: "https://www.freecodecamp.org/learn/job-ready/" }, project: "Add 3 numbers to resume bullets, re-upload, score rises" },
          { id: "apply", name: "First 5 Applications", course: { t: "Internshala Marketing", u: "https://internshala.com/internships/marketing-internship/" }, project: "Apply to 5 marketing roles, log responses" },
        ],
      },
    ],
  },
  govt: {
    label: "Govt Exams (SSC/UPSC/Bank)",
    branches: [
      {
        id: "gk",
        name: "GK & Current Affairs",
        skills: [
          { id: "gk", name: "Static GK", course: { t: "Lucent GK (free PDF)", u: "https://www.ssc.gov.in/" }, project: "Read 2 chapters, write 20 flashcards" },
          { id: "affairs", name: "Current Affairs", course: { t: "PIB Daily (official)", u: "https://pib.gov.in/" }, project: "30-day current-affair notes (1 fact/day)" },
          { id: "polity", name: "Polity", course: { t: "M. Laxmikanth summary (free)", u: "https://www.ssc.gov.in/" }, project: "10 articles summary sheet (Art. 14, 19, 21, etc.)" },
        ],
      },
      {
        id: "aptitude",
        name: "Aptitude",
        skills: [
          { id: "quant", name: "Quantitative", course: { t: "Quant — NPTEL Aptitude", u: "https://swayam.gov.in/" }, project: "Solve 50 quant Qs, log mistakes" },
          { id: "reasoning", name: "Reasoning", course: { t: "Reasoning — Indiabix (free)", u: "https://www.indiabix.com/" }, project: "21-day reasoning streak tracker" },
          { id: "english", name: "English", course: { t: "English — Indiabix (free)", u: "https://www.indiabix.com/english.html" }, project: "30-day vocab + comprehension sheet" },
        ],
      },
      {
        id: "history",
        name: "History & Static",
        skills: [
          { id: "history", name: "History", course: { t: "NPTEL History (free)", u: "https://swayam.gov.in/" }, project: "Timeline of 10 key events (1 page)" },
          { id: "economy", name: "Economy Basics", course: { t: "Economy — Mrunal (free)", u: "https://www.ssc.gov.in/" }, project: "10-key-concept flashcards + 1-page cheat sheet" },
        ],
      },
      {
        id: "ship",
        name: "Mocks & Apply",
        skills: [
          { id: "mocks", name: "Mock Tests", course: { t: "Testbook Free Mocks", u: "https://www.testbook.com/" }, project: "10 mocks logged with score analysis" },
          { id: "pyq", name: "PYQ Analysis", course: { t: "SSC PYQs (official)", u: "https://www.ssc.gov.in/" }, project: "Last 5 yrs SSC quant topic frequency sheet" },
          { id: "apply", name: "Apply to 3 Exams", course: { t: "SSC / IBPS / UPSC portals", u: "https://www.ssc.gov.in/" }, project: "Register for 3 exams, save confirmation screenshots" },
        ],
      },
    ],
  },
};

export const QUEST_TREE = {
  ayush: {
    label: "Ayush Professional",
    branches: [...AYUSH_TREE.ayush.branches, ...UPSKILL_BRANCHES],
  },
  ...TECH_TREES,
};

export function questFor(roleKey) {
  return QUEST_TREE[roleKey] || QUEST_TREE.ayush;
}
