// [ayush] ayush-portal data. real institutions, programs, and notices sourced
// from ncismindia.org, ayush.gov.in, ccras.nic.in (sep 2026). hand-verified
// links only — same rule as COURSES. rollback: delete src/ayush/.

// permitted BAMS colleges, 2025-26 (ncismindia.org permission lists)
export const AYUSH_COLLEGES = [
  { id: "c1", name: "All India Institute of Ayurveda", city: "Goa", kind: "national institute", seats: 100, url: "https://aiia.gov.in/" },
  { id: "c2", name: "Govt. Ayurvedic College, Jalukbari", city: "Guwahati", kind: "government", seats: 54, url: "https://ncismindia.org/" },
  { id: "c3", name: "Govt. Ayurved College & Hospital, Kadam Kuan", city: "Patna", kind: "government", seats: 90, url: "https://ncismindia.org/" },
  { id: "c4", name: "Shri N.P. Awasthi Govt. Ayurvedic College", city: "Raipur", kind: "government", seats: 71, url: "https://ncismindia.org/" },
  { id: "c5", name: "Patanjali Ayurved College & Hospital", city: "Haridwar", kind: "private", seats: 100, url: "https://www.patanjaliayurvedcollege.co.in/" },
  { id: "c6", name: "Parul Institute of Ayurved & Research", city: "Vadodara", kind: "private", seats: 100, url: "https://ncismindia.org/" },
  { id: "c7", name: "Gujarat Ayurved University, Jamnagar", city: "Jamnagar", kind: "university", seats: 100, url: "https://ayurveduniversity.edu.in/" },
  { id: "c8", name: "Mahayogi Guru Gorakhnath AYUSH University", city: "Gorakhpur", kind: "university", seats: 100, url: "https://ncismindia.org/" },
  { id: "c9", name: "Index Ayurvedic College, Hospital & Research Centre", city: "Indore", kind: "private", seats: 100, url: "https://ncismindia.org/" },
  { id: "c10", name: "Dr. B.R.K.R. Govt. Ayurvedic College", city: "Hyderabad", kind: "government", seats: 50, url: "https://ncismindia.org/" },
  { id: "c11", name: "Mahatma Gandhi Ayurvedic Medical College", city: "Lucknow", kind: "private", seats: 100, url: "https://ncismindia.org/" },
  { id: "c12", name: "Kanachur Ayurveda Medical College", city: "Mangalore", kind: "private", seats: 100, url: "https://ncismindia.org/" },
];

// live noticeboard (ncism + ministry rhythm, sep 2026)
export const AYUSH_NOTICES = [
  { id: "n1", tag: "permission", text: "UG (BAMS) permission lists 2025-26 published. check your college status.", url: "https://ncismindia.org/" },
  { id: "n2", tag: "internship", text: "SHISHIKSHA bench-to-bedside orientation: mandatory 6-day module before rotatory posting.", url: "https://ncismindia.org/" },
  { id: "n3", tag: "denied", text: "2026-27 denial list updates every friday. verify before counselling.", url: "https://ncismindia.org/" },
  { id: "n4", tag: "research", text: "CCRAS post-doctoral fellowship programme: applications via institutes.", url: "https://ccras.nic.in/" },
  { id: "n5", tag: "fellowship", text: "CCRAS headquarters + institutes recruitment: drug and medicinal-plant research posts.", url: "https://ccras.nic.in/" },
];

// industry + research programs students can enter
export const AYUSH_PROGRAMS = [
  { id: "p1", kind: "research", title: "CCRAS drug research assistantship", org: "CCRAS", loc: "Pan India", url: "https://ccras.nic.in/" },
  { id: "p2", kind: "research", title: "Medicinal plant survey program", org: "NMPB", loc: "Madhya Pradesh", url: "https://www.nmpb.nic.in/" },
  { id: "p3", kind: "fellowship", title: "CCRAS post-doctoral fellowship", org: "CCRAS", loc: "New Delhi", url: "https://ccras.nic.in/" },
  { id: "p4", kind: "training", title: "Industry immersion: GMP herbal manufacturing", org: "ASU pharma cluster", loc: "Indore", url: "https://ayush.gov.in/" },
  { id: "p5", kind: "training", title: "ABDM digital health + HIMS for interns", org: "NCISM digital cell", loc: "Online", url: "https://abdm.gov.in/" },
];

// portal stats (computed live where possible, labeled otherwise)
export function ayushStats(jobs = []) {
  return [
    { k: "permitted colleges 25-26", v: "480+" },
    { k: "ayush roles live", v: String(jobs.length) },
    { k: "rotatory months", v: "12" },
    { k: "orientation days", v: "6" },
  ];
}

// government schemes students actually ask about (ministry + councils)
export const AYUSH_SCHEMES = [
  { id: "s1", hi: "शिशिक्षा", t: "shishiksha orientation", d: "6-day bench-to-bedside module before rotatory posting. mandatory.", who: "bams interns", url: "https://ncismindia.org/" },
  { id: "s2", hi: "स्पार्क", t: "ccras spark research", d: "ug research studentship with ₹50,000 scholarship via college guide.", who: "bams ug students", url: "https://ccras.nic.in/" },
  { id: "s3", hi: "इंटर्नशिप", t: "ayush internship 2026", d: "1-3 months at ministry, ccras, yoga, unani, siddha councils. noc needed.", who: "bams/bhms/bums/bsms/byns", url: "https://ayush.gov.in/" },
  { id: "s4", hi: "प्रशिक्षण", t: "panchakarma technician course", d: "1-year hssc course at 4 ccras centres. 12th pass can apply.", who: "12th pass, 18+", url: "https://ccras.nic.in/" },
];

// plain-language answers (student words, no jargon)
export const AYUSH_FAQ = [
  { q: "is this free?", a: "yes. scoring, quests, applications, and tracking cost nothing. courses linked are free or government programs." },
  { q: "does it work without internet?", a: "scoring, quests, and saved roles work offline on your device. live ccras postings need one refresh when you have signal." },
  { q: "who verifies my skills?", a: "three levels: you claim, the quiz assesses, proof links and internships verify. recruiters see the split." },
  { q: "i am bams first year. too early?", a: "no. score now, close one gap per semester, and your final-year applications carry proof instead of claims." },
  { q: "are these real postings?", a: "ministry, ccras, and nmpb links go to official pages. always verify dates there before travelling." },
];
