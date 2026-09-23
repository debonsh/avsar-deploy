// ponytail: quiz banks are static data + 3 pure fns. Sampling reuses pickForId
// (stable per device id + day), storage guarded so node --test never touches DOM.
import { pickForId } from "../lib/quests.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { AYUSH_QUIZ } from "../ayush/seed.js";

// ponytail: 20 factual 1-line Qs per lane; QuizView samples 10 per run.
// One bank per scoring lane (lib/track.js): ayush on the ayurveda portal,
// sde/data/marketing/govt on the tech portal. Ported verbatim from the earlier tech build.
const AYUSH_EXTRA = [
  { q: "Abhyanga is best described as?", opts: ["Herbal oil massage", "Nasal therapy", "Eye bath", "Bloodletting"], ans: 0 },
  { q: "Nasya administers medicine through which route?", opts: ["Oral", "Nasal", "Rectal", "Topical"], ans: 1 },
  { q: "Which text is called the 'great triad' (Brihattrayi) member on surgery?", opts: ["Charaka Samhita", "Sushruta Samhita", "Ashtanga Hridaya", "Bhavaprakasha"], ans: 1 },
  { q: "Pathya in Ayurveda means?", opts: ["Fasting", "Wholesome diet-regimen", "Surgery", "Detox only"], ans: 1 },
  { q: "Basti karma primarily balances which dosha?", opts: ["Pitta", "Kapha", "Vata", "All equally"], ans: 2 },
  { q: "Rasayana therapy aims at?", opts: ["Rejuvenation", "Purgation", "Cautery", "Amputation"], ans: 0 },
  { q: "Which ministry runs the National AYUSH Mission?", opts: ["Ministry of Health", "Ministry of Ayush", "NITI Aayog", "ICMR"], ans: 1 },
  { q: "Dinacharya refers to?", opts: ["Seasonal regimen", "Daily regimen", "Surgical tools", "Drug doses"], ans: 1 },
  { q: "Anupana means?", opts: ["Diagnosis", "Vehicle for medicine", "Pulse reading", "Diet chart"], ans: 1 },
  { q: "Agni in Ayurveda most closely maps to?", opts: ["Immunity", "Digestive/metabolic fire", "Body heat only", "Fever"], ans: 1 },
];

const SDE = [
  { q: "Which keyword declares a block-scoped variable in JS?", opts: ["var", "let", "def", "dim"], ans: 1 },
  { q: "What does `===` compare in JavaScript?", opts: ["Value only", "Type only", "Value and type", "Reference only"], ans: 2 },
  { q: "Which hook holds state in a React function component?", opts: ["useEffect", "useState", "useRef", "useMemo"], ans: 1 },
  { q: "JSX compiles down to which call?", opts: ["React.createElement", "React.render", "React.compile", "React.parse"], ans: 0 },
  { q: "Which method adds an item to the end of a JS array?", opts: ["shift()", "unshift()", "push()", "pop()"], ans: 2 },
  { q: "Node.js runs on which engine?", opts: ["SpiderMonkey", "V8", "Chakra", "JSCore"], ans: 1 },
  { q: "Which command stages all changes in Git?", opts: ["git commit", "git add .", "git push", "git stage"], ans: 1 },
  { q: "Which SQL clause filters grouped rows?", opts: ["WHERE", "HAVING", "ORDER BY", "LIMIT"], ans: 1 },
  { q: "Time complexity of binary search on sorted input?", opts: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], ans: 1 },
  { q: "Which HTTP method is idempotent and fetches data?", opts: ["POST", "PUT", "GET", "PATCH"], ans: 2 },
  { q: "What status code means 'Created'?", opts: ["200", "201", "301", "404"], ans: 1 },
  { q: "Which tag creates a hyperlink in HTML?", opts: ["<link>", "<a>", "<href>", "<url>"], ans: 1 },
  { q: "Which CSS property lays out items in a row or column?", opts: ["display: flex", "position: fixed", "float: left", "clear: both"], ans: 0 },
  { q: "Python list vs tuple: which is immutable?", opts: ["list", "tuple", "dict", "set"], ans: 1 },
  { q: "What does an API return so programs can read it?", opts: ["Pixels", "Structured data", "Fonts", "Cookies only"], ans: 1 },
  { q: "Which file lists a Node project's dependencies?", opts: ["package.json", "node.modules", "index.html", ".gitignore"], ans: 0 },
  { q: "What does `git pull` do?", opts: ["Deletes a branch", "Fetches + merges remote", "Starts a repo", "Shows logs"], ans: 1 },
  { q: "Which data structure uses LIFO order?", opts: ["Queue", "Stack", "Heap", "Graph"], ans: 1 },
  { q: "React re-renders a component when what changes?", opts: ["CSS file", "State or props", "Folder name", "README"], ans: 1 },
  { q: "Which key makes a React list render correctly?", opts: ["Unique key prop", "CSS class", "Inline style", "index.css"], ans: 0 },
];

const DATA = [
  { q: "Which SQL keyword removes duplicate rows from results?", opts: ["UNIQUE", "DISTINCT", "FILTER", "SINGLE"], ans: 1 },
  { q: "Which clause sorts query results?", opts: ["GROUP BY", "ORDER BY", "HAVING", "JOIN"], ans: 1 },
  { q: "Pandas DataFrame is most like which structure?", opts: ["Image", "Table", "Audio clip", "Folder"], ans: 1 },
  { q: "Which function reads a CSV into a DataFrame?", opts: ["pd.read_csv()", "pd.open()", "pd.load()", "pd.csv()"], ans: 0 },
  { q: "Mean, median, mode all measure what?", opts: ["Spread", "Central tendency", "Correlation", "Skew only"], ans: 1 },
  { q: "Which chart shows a trend over time?", opts: ["Pie chart", "Line chart", "Donut", "Word cloud"], ans: 1 },
  { q: "A NULL in SQL means what?", opts: ["Zero", "Missing value", "Empty string", "False"], ans: 1 },
  { q: "Which join keeps all left-table rows?", opts: ["INNER", "LEFT", "CROSS", "SELF"], ans: 1 },
  { q: "Excel VLOOKUP searches on which axis by default?", opts: ["Horizontal", "Vertical", "Diagonal", "Circular"], ans: 1 },
  { q: "Which of these is a measure of spread?", opts: ["Mean", "Median", "Std deviation", "Mode"], ans: 2 },
  { q: "A primary key must be what?", opts: ["Nullable", "Unique + not null", "Text only", "Auto-hidden"], ans: 1 },
  { q: "Which plot shows correlation between two numbers?", opts: ["Bar", "Scatter", "Pie", "Funnel"], ans: 1 },
  { q: "What does GROUP BY do?", opts: ["Sorts", "Aggregates per group", "Deletes", "Joins"], ans: 1 },
  { q: "Tableau and Power BI are mainly used for what?", opts: ["Dashboards", "Compilers", "Drivers", "Firewalls"], ans: 0 },
  { q: "Which Python lib is built for numeric arrays?", opts: ["Requests", "NumPy", "Flask", "Pygame"], ans: 1 },
  { q: "An outlier is best described as what?", opts: ["Average point", "Extreme value", "Missing value", "Duplicate"], ans: 1 },
  { q: "Which Excel feature summarizes rows into pivots?", opts: ["Flash Fill", "PivotTable", "Freeze Panes", "Solver"], ans: 1 },
  { q: "COUNT(*) counts what?", opts: ["Columns", "Rows", "Tables", "Databases"], ans: 1 },
  { q: "A histogram visualizes which kind of data?", opts: ["Distribution", "Network", "Hierarchy", "Geo only"], ans: 0 },
  { q: "Cleaning data first matters because models do what?", opts: ["Run slower", "Amplify dirty inputs", "Need GPUs", "Skip nulls safely"], ans: 1 },
];

const MARKETING = [
  { q: "SEO primarily improves what?", opts: ["Paid bids", "Organic search rank", "Print reach", "TV slots"], ans: 1 },
  { q: "CTR stands for what?", opts: ["Click-through rate", "Cost to retain", "Creative test run", "Channel total reach"], ans: 0 },
  { q: "Which metric tracks cost per 1,000 impressions?", opts: ["CPC", "CPM", "CPA", "CR"], ans: 1 },
  { q: "A buyer persona describes what?", opts: ["A logo", "An ideal customer", "A patent", "A server"], ans: 1 },
  { q: "Which channel is owned media?", opts: ["Paid ads", "Email list", "Press mention", "Billboard"], ans: 1 },
  { q: "A/B testing compares what?", opts: ["Two variants", "Two budgets", "Two CEOs", "Two logos only"], ans: 0 },
  { q: "Top of funnel content should do what?", opts: ["Hard sell", "Attract + educate", "Invoice", "Refund"], ans: 1 },
  { q: "Which copy formula is Attention-Interest-Desire-Action?", opts: ["AIDA", "FIFO", "LIFO", "CRUD"], ans: 0 },
  { q: "Canva is mainly used for what?", opts: ["Video encoding", "Quick creatives", "Bookkeeping", "DNS"], ans: 1 },
  { q: "Open rate measures which channel?", opts: ["SEO", "Email", "OOH", "Radio"], ans: 1 },
  { q: "Which tag helps search engines read a page?", opts: ["<meta>", "<blink>", "<marquee>", "<font>"], ans: 0 },
  { q: "Retargeting shows ads to whom?", opts: ["Strangers", "Past visitors", "Employees", "Bots"], ans: 1 },
  { q: "UGC stands for what?", opts: ["User-generated content", "United game club", "Universal grid code", "Urgent ad call"], ans: 0 },
  { q: "Which metric shows ad spend efficiency?", opts: ["ROAS", "RAM", "ROM", "RPM"], ans: 0 },
  { q: "A lead magnet offers what?", opts: ["Free value for contact info", "A discount code only", "A job", "A refund"], ans: 0 },
  { q: "Social proof includes which of these?", opts: ["Testimonials", "Invoices", "Pay slips", "NDAs"], ans: 0 },
  { q: "Which is a vanity metric?", opts: ["Revenue", "Raw likes", "Signups", "Retention"], ans: 1 },
  { q: "Email unsubscribes spike when you do what?", opts: ["Personalize", "Spam daily blasts", "Segment", "Test subject"], ans: 1 },
  { q: "GA4 mainly tracks what?", opts: ["Server uptime", "User behavior", "Payroll", "Inventory"], ans: 1 },
  { q: "A CTA button should do what?", opts: ["Blend in", "Ask one clear action", "List 5 links", "Open 3 tabs"], ans: 1 },
];

const GOVT = [
  { q: "Who is called the Father of the Indian Constitution?", opts: ["Nehru", "Ambedkar", "Patel", "Gandhi"], ans: 1 },
  { q: "Article 21 guarantees which right?", opts: ["Equality", "Life + liberty", "Religion", "Property"], ans: 1 },
  { q: "First Battle of Panipat was fought in which year?", opts: ["1526", "1556", "1761", "1857"], ans: 0 },
  { q: "Which number comes next: 2, 6, 12, 20, ?", opts: ["28", "30", "32", "24"], ans: 1 },
  { q: "Synonym of 'Candid'?", opts: ["Rude", "Frank", "Shy", "Clever"], ans: 1 },
  { q: "If 15% of 200 students play chess, how many is that?", opts: ["25", "30", "35", "20"], ans: 1 },
  { q: "Which river is called the Sorrow of Bihar?", opts: ["Ganga", "Kosi", "Yamuna", "Son"], ans: 1 },
  { q: "Quit India Movement started in which year?", opts: ["1942", "1930", "1947", "1919"], ans: 0 },
  { q: "Odd one out: 3, 5, 7, 9, 11?", opts: ["3", "5", "9", "11"], ans: 2 },
  { q: "Antonym of 'Transparent'?", opts: ["Clear", "Opaque", "Obvious", "Honest"], ans: 1 },
  { q: "Who presents the Union Budget in India?", opts: ["PM", "Finance Minister", "RBI Governor", "President"], ans: 1 },
  { q: "A train at 60 km/h covers 180 km in how long?", opts: ["2 h", "3 h", "4 h", "2.5 h"], ans: 1 },
  { q: "Capital of Australia?", opts: ["Sydney", "Canberra", "Melbourne", "Perth"], ans: 1 },
  { q: "Which Mughal built the Taj Mahal?", opts: ["Akbar", "Shah Jahan", "Babur", "Aurangzeb"], ans: 1 },
  { q: "Coding: CAT = 24, DOG = 26, BAT = ?", opts: ["23", "25", "22", "24"], ans: 0 },
  { q: "Who administers the oath to the President?", opts: ["PM", "CJI", "Speaker", "VP"], ans: 1 },
  { q: "Simplify: 12 + 8 × 2?", opts: ["40", "28", "32", "20"], ans: 1 },
  { q: "Largest planet in our solar system?", opts: ["Saturn", "Jupiter", "Earth", "Mars"], ans: 1 },
  { q: "National Song 'Vande Mataram' was written by?", opts: ["Tagore", "Bankim Chandra", "Nehru", "Sarojini"], ans: 1 },
  { q: "If selling price is 120 and profit 20%, cost price is?", opts: ["96", "100", "110", "90"], ans: 1 },
];

export const QUIZ = {
  ayush: [...AYUSH_QUIZ, ...AYUSH_EXTRA],
  sde: SDE,
  data: DATA,
  marketing: MARKETING,
  govt: GOVT,
};

// ponytail: one home for grading; gradeQuiz covers the bank, gradeSet any sample.
export function gradeSet(questions = [], picks = []) {
  const total = questions.length;
  if (!total) return { score: 0, correct: 0, total: 0 };
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (picks[i] === questions[i].ans) correct++;
  }
  return { score: Math.round((correct / total) * 100), correct, total };
}

export function gradeQuiz(role, picks = []) {
  const bank = QUIZ[role];
  if (!bank) return { score: 0, correct: 0, total: 0 };
  return gradeSet(bank, picks);
}

// ponytail: deterministic 10/20 sample, stable per student per day.
// Uses pickForId per slot (no replacement) so siblings on one device differ.
export function quizSample(role, id = "", day = "", n = 10) {
  const bank = QUIZ[role] || [];
  if (!bank.length) return [];
  const pool = [...bank];
  const out = [];
  const count = Math.min(n, pool.length);
  for (let i = 0; i < count; i++) {
    const pick = pickForId(pool, `${id}:${day}`, `${role}:${i}`);
    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

const bestKey = (role) => `avsar-quiz-${role}`;

export function loadQuizBest(role) {
  return Number(loadJSON(bestKey(role), 0)) || 0;
}

export function saveQuizBest(role, score) {
  try {
    const prev = loadQuizBest(role);
    const best = Math.max(prev, Math.round(score || 0));
    saveJSON(bestKey(role), best);
    return best;
  } catch {
    return score;
  }
}

export function todayDay() {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
