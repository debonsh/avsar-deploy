// [ayush] sample BAMS resumes. realistic biodata-style texts in the shapes the
// checker actually reads (contact line, sections, numbers, skills). powers
// "try a sample" across assess + resume checker. rollback: delete src/ayush/.
export const AYUSH_RESUMES = [
  {
    id: "ananya",
    label: "ananya · bams final year",
    text: `Ananya Sharma
ananya.sharma99@gmail.com | 98220 44510 | Pune, Maharashtra | Reg: MH-AYU-2026-18412

CAREER OBJECTIVE
BAMS final-year student seeking a Clinical Research Associate internship in ayurveda. Strong in dravyaguna and OPD documentation. Working toward GCP documentation and pharmacovigilance.

EDUCATION
BAMS, Bharati Vidyapeeth Ayurved College, Pune (2022-2026), 68%
HSC, Maharashtra Board, 2022, 81%

ROTATORY INTERNSHIP (ongoing)
Kayachikitsa OPD assistant, college hospital (4 months): wrote 120+ case sheets, assisted 40 panchakarma sittings (snehana, swedana). Maintained HIMS entries for 200 patients.

PROJECTS
Herbarium of 25 medicinal plants with latin names and uses, photographed (2024).
Swasthavritta survey: surveyed 60 households on nutrition, 1-page report.

SKILLS
dravyaguna, diagnosis, documentation, panchakarma, hims, sanskrit

CERTIFICATES
SHISHIKSHA orientation module, NCISM (2025).

LANGUAGES
English, Hindi, Marathi, Sanskrit (reading)`,
  },
  {
    id: "rohit-weak",
    label: "rohit · fresher, thin resume",
    text: `Rohit Verma
rohitv12@yahoo.com | Lucknow

OBJECTIVE
To serve the people by using my medical qualification and help them maintain good health with ayurveda.

EDUCATION
BAMS, Lucknow Ayurvedic College (2021-2026), 58%

INTERNSHIP
Completed rotatory internship at college hospital.

SKILLS
ayurveda, treatment, hardworking, sincere

LANGUAGES
Hindi, English`,
  },
  {
    id: "kavya-therapist",
    label: "kavya · panchakarma therapist",
    text: `Kavya Nair
kavya.nair.kerala@gmail.com | 98470 11223 | Thrissur, Kerala

OBJECTIVE
Panchakarma therapist with 2 years of hands-on snehana, swedana, and nasya practice. Seeking wellness resort role with NABH hospital exposure.

EXPERIENCE
Panchakarma Therapist, Kairali Retreat, Palakkad (2024-2026): delivered 500+ therapy sittings, maintained therapy logs for 150 guests, assisted vaidya in virechana prep for 30 cases. Guest satisfaction 4.8/5 across 90 reviews.

EDUCATION
BAMS, Govt. Ayurveda College, Thiruvananthapuram (2019-2024), 71%
Panchakarma Technician Course, NARIP Cheruthuruthy (2023): 1 year, HSSC certified.

SKILLS
panchakarma, diagnosis, documentation, pharmacy, sanskrit, communication

CERTIFICATES
HSSC Panchakarma Technician, NSDC (2023). NABH hospital protocols workshop (2024).

LANGUAGES
English, Hindi, Malayalam`,
  },
  {
    id: "deshmukh-vaidya",
    label: "dr. deshmukh · 6 yrs vaidya",    text: `Dr. Suresh Deshmukh, BAMS, MD (Kayachikitsa)
dr.deshmukh.vaidya@gmail.com | 94230 77881 | Nashik, Maharashtra | Reg: MH-AYU-2017-09233

OBJECTIVE
Kayachikitsa vaidya with 6 years of OPD/IPD practice. 4000+ patients treated. Seeking senior consultant + clinical research role in ayurvedic drug standardization.

EXPERIENCE
Senior Vaidya, Nashik Ayurved Hospital (2021-2026): led kayachikitsa OPD of 60 patients/day, supervised 4 interns, digitized 3000 case records into HIMS, cut waiting time 25% via token triage.
Resident Vaidya, Panchakarma Kendra, Pune (2019-2021): 800+ snehana/swedana sittings, pharmacovigilance ADR reporting for 12 cases.

EDUCATION
MD Kayachikitsa, Pune University (2019). BAMS (2017), 74%.

RESEARCH
Co-author, "Standardization of Triphala Ghana Vati", CCRAS journal (2024). SPARK mentor for 2 UG projects.

SKILLS
diagnosis, dravyaguna, panchakarma, documentation, pharmacovigilance, gmp, hims, research, sanskrit

CERTIFICATES
GCP clinical documentation, CCRAS (2023). RAV CME: research methodology (2024).

LANGUAGES
English, Hindi, Marathi, Sanskrit`,
  },
];

// What a strong BAMS resume contains, in the order screeners skim.
// Rendered as the guide on the Resume page; shapes mirror the ATS dimensions.
export const RESUME_ANATOMY = [
  { section: "Contact line", what: "Name, email, phone, city, council registration number.", why: "Hospitals verify registration before shortlisting. Missing contact is the most common auto-reject." },
  { section: "Objective (2 lines)", what: "Target role plus your two strongest skills.", why: "A reader decides in 10 seconds whether the rest is worth reading." },
  { section: "Education", what: "BAMS college, years, percentage. MD next if any.", why: "NCISM-recognized college plus internship status sets your eligibility band." },
  { section: "Postings / internship", what: "Department, months, cases written, sittings assisted, all with numbers.", why: "Numbers are the difference between Ananya (120+ case sheets) and Rohit (one flat line)." },
  { section: "Projects", what: "Herbarium, surveys, case logs. Each with a link.", why: "Proof links are what the checker verifies and what interviewers open." },
  { section: "Skills + certificates", what: "Clinical skills first, then SHISHIKSHA, CME, HSSC certs.", why: "Skills must match the posting words exactly or matching misses them." },
];

// Weak vs strong bullets, lifted from the Rohit (thin) and Ananya (strong) samples.
export const RESUME_BULLETS = [
  { weak: "Completed rotatory internship at college hospital.", strong: "Rotatory intern, Kayachikitsa OPD (4 months): wrote 120+ case sheets, assisted 40 panchakarma sittings.", note: "Department, duration, and two numbers turn a claim into evidence." },
  { weak: "Skills: ayurveda, treatment, hardworking.", strong: "Skills: dravyaguna, diagnosis, documentation, panchakarma, hims, sanskrit.", note: "Postings match literal skill words. Traits are not skills." },
  { weak: "To serve the people with my medical qualification.", strong: "BAMS final-year student seeking a Clinical Research Associate internship. Strong in dravyaguna and OPD documentation.", note: "Name the role you want plus the two skills that qualify you for it." },
];

// Per skill: why postings ask for it, and what counts as proof on your resume.
export const SKILL_WHY = {
  diagnosis: { why: "Every OPD, JRF, and panchakarma posting screens on it first.", proof: "10+ anonymized case sheets in NCISM format, linked." },
  documentation: { why: "Hospitals run on case sheets, HIMS entries, and ADR forms.", proof: "E-logbook with 15+ entries or a filed ADR report." },
  panchakarma: { why: "Resorts, NABH hospitals, and technician courses all demand supervised sittings.", proof: "Snehana-Swedana log from 5+ supervised sittings." },
  dravyaguna: { why: "Pharma, NMPB, and research roles need plant identification skill.", proof: "20-plant herbarium with latin names, photographed." },
  gmp: { why: "ASU manufacturers hire only candidates who speak GMP.", proof: "SWAYAM pharma quality cert plus a 1-page gap note." },
  pharmacovigilance: { why: "CCRAS and hospitals must report ADRs; few freshers can.", proof: "One mock PvPI-format ADR report, linked." },
  hims: { why: "Digitized hospitals expect interns to enter cases cleanly.", proof: "HIMS/ABDM basics cert plus logged entries." },
  research: { why: "SPARK, JRF, and CCRAS postings filter on research exposure.", proof: "Survey report, co-author credit, or SPARK application." },
  pharmacy: { why: "Rasa-shastra units and testing labs need formulation basics.", proof: "Bhaishajya Kalpana coursework plus lab visit log." },
  sanskrit: { why: "Classical references in interviews and PG entrances assume it.", proof: "Sanskrit for Ayurveda cert." },
  shishiksha: { why: "NCISM orientation is the gate to rotatory postings.", proof: "Signed 6-day checklist." },
};
