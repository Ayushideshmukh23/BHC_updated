// app/api/bhc-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { retrieve } from '../../../lib/rag';
import { buildPrompt } from '../../../lib/systemPrompt';

export const runtime = 'nodejs';

const USE_LLM = process.env.USE_LLM !== 'false';
const client = new BedrockRuntimeClient({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
});

// ---------- helpers ----------
function tooShort(s?: string) {
  const t = (s || '').trim();
  return !t || /^ok(ay)?[.!]?$/i.test(t) || t.length < 60;
}

function isBhcTopic(q: string) {
  return /\bbhc\b|bhc\s*global/i.test(q || '');
}
function isPcaiTopic(q: string) {
  return /pcai|powerconnect/i.test(q || '');
}

function enforceBrandCasing(text: string) {
  if (!text) return text;
  let out = text.replace(/power\s*connect\.?ai|powerconnect\.ai/gi, 'POWERCONNECT.AI');
  if (/\bPCAI\b/i.test(out)) {
    out = out.replace(/POWERCONNECT\.AI(?!\s*\(PCAI\))/, 'POWERCONNECT.AI (PCAI)');
  }
  return out;
}

function cleanBody(s: string) {
  return s
    .replace(/©\s?\d{4}.*?reserved\./i, '')
    .replace(/\b(LinkedIn|X|Twitter|BHC Portal|Website→)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickPcaiPrimary(urls: string[]) {
  const about = urls.find(u => /powerconnect\.ai\/about-us\/?$/i.test(u));
  if (about) return about;
  const home = urls.find(u => /^https?:\/\/(www\.)?powerconnect\.ai\/?$/i.test(u));
  if (home) return home;
  const features = urls.find(u => /powerconnect\.ai\/features\/?$/i.test(u));
  if (features) return features;
  return urls[0] || '';
}

type Intent = 'services' | 'about' | 'careers' | null;
function getIntent(q: string): Intent {
  const s = q.toLowerCase();
  if (/service(s)?\b/.test(s)) return 'services';
  if (/\bcareer(s)?\b|jobs?\b|hiring\b/.test(s)) return 'careers';
  if (/\babout\b|who\s+are\s+you\b|what\s+is\s+bhc\b/.test(s)) return 'about';
  return null;
}
function intentMatchesUrl(intent: Intent, url: string) {
  const u = url.toLowerCase();
  if (!intent) return true;
  if (intent === 'services') return /bhcglobal\.com\/[^ ]*services/.test(u);
  if (intent === 'about')    return /bhcglobal\.com\/[^ ]*about-us/.test(u);
  if (intent === 'careers')  return /bhcglobal\.com\/[^ ]*careers/.test(u);
  return true;
}

// ---------- LLM call ----------
async function callClaude(system: string, messages: any[]) {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    system,
    max_tokens: 900,
    temperature: 0.2,
    top_p: 0.9,
    messages: messages.map(m => ({
      role: m.role,
      content: [{ type: 'text', text: String(m.content || '') }],
    })),
  };

  const res = await client.send(
    new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID!,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    })
  );

  const decoded = JSON.parse(new TextDecoder().decode(res.body));
  return (decoded?.content?.[0]?.text ?? '').trim();
}

// ---------- Fallback from snippets (intent-aware) ----------
function composeFromSnippets(query: string, snippets: string[]) {
  if (!snippets.length) {
    return "I couldn’t find matching internal content. Try asking about services, AMI InsightAccelerator, careers, locations, or POWERCONNECT.AI.";
  }

  const isPcai = isPcaiTopic(query);
  const intent = getIntent(query);

  type Card = { url: string; title: string; body: string };
  const cards: Card[] = [];

  for (const s of snippets) {
    const lines = s.split('\n').filter(Boolean);
    if (lines.length < 3) continue;

    const urlMatch = lines[0].match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0] : '';
    const title = (lines[1] || '').trim();
    const rawBody = cleanBody(lines.slice(2).join(' '));
    if (!rawBody) continue;

    const body = rawBody.length > 300 ? rawBody.slice(0, 300).replace(/\s+\S*$/, '…') : rawBody;
    cards.push({ url, title, body });
  }

  if (!cards.length) {
    return "I couldn’t find a clean excerpt to show.";
  }

  // PCAI: single authoritative answer + single link
  if (isPcai) {
    const urls = cards.map(c => c.url).filter(Boolean);
    const bestUrl = pickPcaiPrimary(urls);
    const picked = cards.find(c => c.url === bestUrl) || cards[0];
    const link = bestUrl ? `\n\nLearn more: [POWERCONNECT.AI](${bestUrl})` : '';
    return `${picked.body}${link}`.trim();
  }

  // BHC topics: filter by intent first (services/about/careers)
  let pool = cards;
  const intentFiltered = cards.filter(c => c.url && intentMatchesUrl(intent, c.url));
  if (intentFiltered.length) pool = intentFiltered;

  // Build up to 3 bullets from the selected pool (dedup by url/title)
  const seen = new Set<string>();
  const bullets: string[] = [];
  for (const c of pool) {
    const key = (c.url || c.title).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const urlOut = c.url ? `  (${c.url})` : '';
    bullets.push(`- **${c.title}** — ${c.body}${urlOut}`);
    if (bullets.length >= 3) break;
  }

  return [`Here’s what I found about “${query}”:`, '', ...bullets].join('\n');
}

// ---------- route ----------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.some((m: any) => !m?.role || !m?.content)) {
      return NextResponse.json(
        { error: 'Invalid payload: expected {messages:[{role,content}]}' },
        { status: 400 }
      );
    }

    const userLast: string = String(messages.filter((m: any) => m.role === 'user').pop()?.content || '');
    const snippets = await retrieve(userLast, 8);
    const system = buildPrompt(snippets);

    let text = '';

    if (USE_LLM) {
      try {
        let augmented = messages.slice();
        const q = userLast.toLowerCase();

        if (/\bami\b/.test(q) || /insight\s*accelerator/.test(q)) {
          augmented = augmented.concat([{ role: 'user', content: 'Explain AMI InsightAccelerator: what it is, who it is for, key benefits, and 3–6 concrete use cases. Use bullets.' }]);
        }
        if (/pcai|powerconnect/.test(q)) {
          augmented = augmented.concat([{ role: 'user', content: 'Summarize POWERCONNECT.AI (PCAI): what it does, who it helps, and key benefits. Include only one link, prefer /about-us from powerconnect.ai.' }]);
        }

        text = await callClaude(system, augmented);
        text = enforceBrandCasing(text);

        if (tooShort(text)) {
          const nudged = augmented.concat([{ role: 'user', content: 'Your last response was too short. Provide a helpful 5–8 sentence answer (or bullets). Avoid replies like "Okay."' }]);
          text = await callClaude(system, nudged);
          text = enforceBrandCasing(text);
        }
      } catch (e: any) {
        console.error('Model call failed:', e?.name || e, e?.message || '');
        text = ''; // fall through to snippets
      }
    }

    // Fallback from JSON (intent-aware)
    if (tooShort(text)) {
      text = composeFromSnippets(userLast, snippets);
      text = enforceBrandCasing(text);
    }

    return NextResponse.json({ text, snippets });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
