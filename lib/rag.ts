// lib/rag.ts
import fs from "fs";
import path from "path";

export type Doc = { url: string; headings?: string[]; content: string; source?: "BHC" | "PCAI" };

// ---------- load & cache ----------
let DATA: Doc[] | null = null;

export function loadData(): Doc[] {
  if (DATA) return DATA;

  const bhcPath = path.join(process.cwd(), "data", "bhc_cleaned_data.json");
  const pcaiPath = path.join(process.cwd(), "data", "pcai_cleaned_data.json");

  const bhc: Doc[] = fs.existsSync(bhcPath)
    ? JSON.parse(fs.readFileSync(bhcPath, "utf-8")).map((d: any) => ({ ...d, source: "BHC" as const }))
    : [];

  const pcai: Doc[] = fs.existsSync(pcaiPath)
    ? JSON.parse(fs.readFileSync(pcaiPath, "utf-8")).map((d: any) => ({ ...d, source: "PCAI" as const }))
    : [];

  DATA = [...bhc, ...pcai];
  return DATA!;
}

// ---------- text utils / synonyms / fuzzy ----------
function normalize(s: string) {
  // keep dots so "powerconnect.ai" stays intact
  return (s || "").toLowerCase().replace(/[^a-z0-9.\s]/g, " ").trim();
}
function tokenize(s: string) {
  return normalize(s).split(/\s+/).filter(Boolean);
}

// Synonyms & common variants
const SYNONYMS: Record<string, string[]> = {
  pcai: ["pcai", "powerconnect", "powerconnectai", "powerconnect.ai", "power connect ai"],
  "powerconnect.ai": ["powerconnect.ai", "pcai", "powerconnect", "powerconnectai", "power connect ai"],
  powerconnect: ["powerconnect", "pcai", "powerconnect.ai", "powerconnectai", "power connect ai"],
  bhc: ["bhc", "bhcglobal", "bhc global"],
  "bhc global": ["bhc global", "bhc", "bhcglobal"],
};

// alias lookup: alias -> its group
const ALIAS_LOOKUP: Record<string, Set<string>> = {};
for (const base in SYNONYMS) {
  const group = new Set<string>([base, ...SYNONYMS[base]].map(normalize));
  for (const term of group) ALIAS_LOOKUP[term] = group;
}

function expandQueryTokens(qTokens: string[]) {
  const out = new Set<string>();
  for (const t of qTokens) {
    out.add(t);
    const group = ALIAS_LOOKUP[t];
    if (group) for (const g of group) out.add(g);
  }
  return Array.from(out);
}

// Levenshtein (small, fast enough)
function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array(b.length + 1)
    .fill(0)
    .map((_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[b.length];
}

function fuzzyHit(docTokens: string[], q: string) {
  // substring check first (helps "powerconnect.ai")
  const joined = docTokens.join(" ");
  if (joined.includes(q)) return true;

  // token-level distance ≤ 1
  for (const t of docTokens) {
    if (Math.abs(t.length - q.length) <= 2 && editDistance(t, q) <= 1) return true;
  }
  return false;
}

function sourceBoost(query: string, source?: string) {
  const q = normalize(query);
  if (/(pcai|powerconnect)/.test(q) && source === "PCAI") return 1.25;
  if (/\bbhc(\s|$)|bhc global/.test(q) && source === "BHC") return 1.15;
  return 1;
}

// ---------- scoring & retrieval ----------
function score(query: string, doc: Doc) {
  const q0 = tokenize(query);
  const q = expandQueryTokens(q0);
  if (!q.length) return 0;

  const headTokens = tokenize((doc.headings || []).join(" "));
  const bodyTokens = tokenize(doc.content || "");

  let bodyHits = 0, headHits = 0;
  for (const w of q) {
    if (fuzzyHit(bodyTokens, w)) bodyHits++;
    if (fuzzyHit(headTokens, w)) headHits++;
  }

  const len = Math.max(200, (doc.content || "").length);
  const lenPenalty = Math.min(1, 800 / len);

  const raw = bodyHits * 2 + headHits * 1.5 * lenPenalty;
  return raw * sourceBoost(query, doc.source);
}

export async function retrieve(query: string, k = 8): Promise<string[]> {
  const CORPUS = loadData();
  const ranked = CORPUS
    .map((d) => ({ d, s: score(query, d) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(
      ({ d }) =>
        `Source: ${d.source} — ${d.url}\n${(d.headings || []).slice(0, 2).join(" • ")}\n${d.content}`
    );

  if (ranked.length) return ranked;

  // fallback: give top k anyway
  return CORPUS.slice(0, Math.min(k, CORPUS.length)).map(
    (d) =>
      `Source: ${d.source} — ${d.url}\n${(d.headings || []).slice(0, 2).join(" • ")}\n${d.content}`
  );
}
