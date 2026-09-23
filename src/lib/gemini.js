// ponytail: strict-JSON validator for AI question sets lives here; transport in ai.js.
// Models propose questions, rubrics dispose points - scores never come from an LLM.

// --- AI question generation: models propose, rubric disposes ---
// Strict JSON contract; anything else -> null -> caller falls back to the bank.
// Shape: [{ text, dimension }] - dimension tags the rubric line the Q probes.
export function parseQuestionSet(raw) {
  try {
    if (!raw || typeof raw !== "string") return null;
    const clean = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(clean);
    if (!Array.isArray(arr)) return null;
    const out = [];
    for (const it of arr) {
      const text = String((it && it.text) || "").trim();
      if (!text) continue;
      out.push({ text, dimension: String((it && it.dimension) || "general").trim().slice(0, 24) });
      if (out.length >= 8) break;
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}
