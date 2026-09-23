// ponytail: role-keyed interview questions, PRD §5 says "one entry per file"
import { AYUSH_INTERVIEW_QS } from "../ayush/seed.js";
export const INTERVIEW_QS = {
  ayush: [
    ...AYUSH_INTERVIEW_QS,
    "A patient asks why Snehana comes before Shodhana: your 30-sec answer?",
    "How do you take informed consent for Vamana in one paragraph?",
    "Your OPD register vs HIMS entry mismatch. How do you reconcile?",
  ],
};
