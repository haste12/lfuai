const { GoogleGenerativeAI } = require('@google/generative-ai');
const { searchWeb, needsWebSearch, isLFUEventQuery, getLFULiveContent } = require('./searchService');
const { buildRAGContext } = require('./ragService');
const { getCached, setCached } = require('./cacheService');
const {
  SYSTEM_PROMPT,
  getGreetingResponse,
  CREATOR_RESPONSE,
  PRESIDENT_RESPONSE,
  GREETINGS,
  CREATOR_TRIGGERS,
  REPLACEMENTS,
} = require('../data/prompts');

// ── Lazy singleton ────────────────────────────────────────────────────────────
let _genAI = null;
function getGeminiClient() {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/app/apikey');
    }
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

// ── Predefined short-circuit responses ───────────────────────────────────────
function getPredefinedResponse(message, userName) {
  const lower = message.toLowerCase().trim();
  if (GREETINGS.has(lower)) return getGreetingResponse(userName);
  if (CREATOR_TRIGGERS.some((t) => lower.includes(t))) return CREATOR_RESPONSE;
  if (lower.includes('president of lebanese french university')) return PRESIDENT_RESPONSE;
  return null;
}

function applyReplacements(text) {
  if (!text) return text;
  let result = text;
  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    result = result.replaceAll(from, to);
  }
  return result;
}

// ── Convert message history to Gemini format ─────────────────────────────────
function buildGeminiHistory(history) {
  const geminiHistory = [];
  for (const msg of history) {
    if (!msg.text || msg.id === 'welcome') continue;
    const role = msg.role === 'bot' ? 'model' : 'user';
    geminiHistory.push({ role, parts: [{ text: msg.text }] });
  }
  return geminiHistory;
}

// ── Performance timer ─────────────────────────────────────────────────────────
function timer() {
  const start = Date.now();
  return { elapsed: () => Date.now() - start };
}

// ── Non-streaming response (fallback) ────────────────────────────────────────
async function getAIResponse(message, userName, history = []) {
  const t = timer();

  // Short-circuit predefined responses
  const predefined = getPredefinedResponse(message, userName);
  if (predefined) return { reply: predefined, sources: [], cached: false };

  // Cache lookup (skip for personalized queries)
  const cached = getCached(message);
  if (cached) {
    console.log(`[AI] Cache HIT in ${t.elapsed()}ms`);
    return { ...cached, cached: true };
  }

  const contextInstruction = '\n\nIMPORTANT: Always maintain full conversation context. When the user says something vague like "more", "continue", "go on", refer back to previous messages and continue from where you left off.';

  const baseSystemContent = userName
    ? SYSTEM_PROMPT + `\n\nThe user's name is ${userName}. Address them by name occasionally.` + contextInstruction
    : SYSTEM_PROMPT + contextInstruction;

  // ── RAG retrieval, with live LFU event fallback ──────────────────────────
  const ragT = timer();
  let systemContent = baseSystemContent;
  let sources = [];
  let webContext = '';

  try {
    const ragResult = await buildRAGContext(message, baseSystemContent);
    if (ragResult?.useRAG && ragResult.ragSystemPrompt) {
      systemContent = ragResult.ragSystemPrompt;
      sources = ragResult.sources || [];
    }

    // If RAG found nothing and it's an LFU event question → fetch live LFU page
    if (ragResult?.noEvidence && isLFUEventQuery(message)) {
      console.log('[AI] No RAG results for event query — fetching live LFU page...');
      const live = await getLFULiveContent();
      if (live?.content) {
        const today = new Date().toISOString().slice(0, 10);
        webContext = `\n\nLIVE CONTENT fetched from ${live.url} on ${today}:\n${live.content}\n\nUse this live content to answer the event/news question. Cite the source URL.`;
      }
    } else if (sources.length === 0 && needsWebSearch(message)) {
      // Non-LFU general web search
      const webResult = await searchWeb(message);
      if (webResult) webContext = `\n\nWeb search results:\n${webResult}\n\nCite these if you use them.`;
    }
  } catch (err) {
    console.warn('[AI] RAG/search failed:', err.message);
  }
  console.log(`[AI] RAG retrieval: ${ragT.elapsed()}ms`);

  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemContent + webContext,
  });

  const geminiHistory = buildGeminiHistory(Array.isArray(history) ? history : []);
  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      temperature: sources.length > 0 ? 0.3 : 0.7,
      maxOutputTokens: 1024,
    },
  });

  const aiT = timer();
  const result = await chat.sendMessage(message);
  const reply = applyReplacements(result.response.text().trim());
  console.log(`[AI] Gemini response: ${aiT.elapsed()}ms | Total: ${t.elapsed()}ms`);

  const response = { reply, sources };
  setCached(message, response);
  return { ...response, cached: false };
}

// ── Streaming response ────────────────────────────────────────────────────────
/**
 * Streams the Gemini response as an async generator of text chunks.
 * Also yields a special { sources } object at the end.
 *
 * @yields {string|{sources:Array}} - text chunks, then sources object
 */
async function* streamAIResponse(message, userName, history = []) {
  const t = timer();

  // Short-circuit predefined
  const predefined = getPredefinedResponse(message, userName);
  if (predefined) {
    yield predefined;
    yield { sources: [], done: true };
    return;
  }

  // Cache lookup
  const cached = getCached(message);
  if (cached) {
    console.log(`[AI] Stream Cache HIT in ${t.elapsed()}ms`);
    yield cached.reply;
    yield { sources: cached.sources || [], done: true, cached: true };
    return;
  }

  const contextInstruction = '\n\nIMPORTANT: Always maintain full conversation context. Continue from previous messages when the user asks follow-up questions.';
  const baseSystemContent = userName
    ? SYSTEM_PROMPT + `\n\nThe user's name is ${userName}. Address them by name occasionally.` + contextInstruction
    : SYSTEM_PROMPT + contextInstruction;

  // ── RAG retrieval + live LFU event fallback ───────────────────────────────
  const ragT = timer();
  let systemContent = baseSystemContent;
  let sources = [];

  try {
    const ragResult = await buildRAGContext(message, baseSystemContent);
    if (ragResult?.useRAG && ragResult.ragSystemPrompt) {
      systemContent = ragResult.ragSystemPrompt;
      sources = ragResult.sources || [];
    }

    // If RAG found nothing for an LFU event query → fetch live LFU page
    if (ragResult?.noEvidence && isLFUEventQuery(message)) {
      console.log('[AI] Stream: No RAG results for event query — fetching live LFU page...');
      const live = await getLFULiveContent();
      if (live?.content) {
        const today = new Date().toISOString().slice(0, 10);
        systemContent += `\n\nLIVE CONTENT fetched from ${live.url} on ${today}:\n${live.content}\n\nUse this live content to answer the event/news question. Cite the source URL. NEVER say you lack live browsing access.`;
      }
    }
  } catch (err) {
    console.warn('[AI] RAG failed (streaming):', err.message);
  }
  console.log(`[AI] RAG retrieval (stream): ${ragT.elapsed()}ms`);

  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemContent,
  });

  const geminiHistory = buildGeminiHistory(Array.isArray(history) ? history : []);
  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      temperature: sources.length > 0 ? 0.3 : 0.7,
      maxOutputTokens: 1024,
    },
  });

  const aiT = timer();
  let firstChunk = true;
  let fullText = '';

  try {
    const streamResult = await chat.sendMessageStream(message);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        if (firstChunk) {
          console.log(`[AI] First token (stream): ${aiT.elapsed()}ms`);
          firstChunk = false;
        }
        const cleaned = applyReplacements(text);
        fullText += cleaned;
        yield cleaned;
      }
    }

    console.log(`[AI] Stream complete: ${t.elapsed()}ms`);

    // Cache the full response
    if (fullText) {
      setCached(message, { reply: fullText, sources });
    }

    yield { sources, done: true, cached: false };
  } catch (err) {
    console.error('[AI] Gemini stream error:', err.message);
    throw err;
  }
}

module.exports = { getAIResponse, streamAIResponse };
