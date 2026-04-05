const OpenAI = require('openai');
const { searchWeb, needsWebSearch } = require('./searchService');
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
let _hfClient = null;
function getHFClient() {
  if (!_hfClient) {
    if (!process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN.includes('YOUR_TOKEN')) {
      throw new Error('HUGGINGFACE_API_TOKEN is not set in your .env file. Get one at https://huggingface.co/settings/tokens');
    }
    _hfClient = new OpenAI({
      apiKey: process.env.HUGGINGFACE_API_TOKEN,
      baseURL: 'https://router.huggingface.co/v1',
    });
  }
  return _hfClient;
}

// ── Predefined short-circuit responses ───────────────────────────────────────
function getPredefinedResponse(message, userName) {
  const lower = message.toLowerCase().trim();
  if (GREETINGS.has(lower)) return getGreetingResponse(userName);
  if (CREATOR_TRIGGERS.some((t) => lower.includes(t))) return CREATOR_RESPONSE;
  if (lower.includes('president of lebanese french university')) return PRESIDENT_RESPONSE;
  return null;
}

function applyReplacements(text) {
  let result = text;
  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    result = result.replaceAll(from, to);
  }
  return result;
}

// ── Main AI call ──────────────────────────────────────────────────────────────
async function getAIResponse(message, userName, history = []) {
  const predefined = getPredefinedResponse(message, userName);
  if (predefined) return predefined;

  const contextInstruction =
    '\n\nIMPORTANT: Always maintain full conversation context. When the user says something vague like "more", "continue", "go on", or asks a follow-up question, always refer back to the previous messages in this conversation and continue from where you left off. Never lose track of what was previously discussed.';

  const systemContent = userName
    ? SYSTEM_PROMPT + `\n\nThe user's name is ${userName}. Address them by name occasionally.` + contextInstruction
    : SYSTEM_PROMPT + contextInstruction;

  // Build messages array in OpenAI chat format
  const messages = [{ role: 'system', content: systemContent }];

  if (Array.isArray(history)) {
    for (const msg of history) {
      if (!msg.text || msg.id === 'welcome') continue;
      const role = msg.role === 'bot' ? 'assistant' : 'user';
      messages.push({ role, content: msg.text });
    }
  }

  // Add the current user message
  messages.push({ role: 'user', content: message });

  // ── Web search (if query needs live data) ──────────────────────────────────
  if (needsWebSearch(message)) {
    console.log('[Search] Fetching web results for:', message);
    const searchResults = await searchWeb(message);
    if (searchResults) {
      // Inject search results as an assistant context hint before the final user message
      messages.splice(messages.length - 1, 0, {
        role: 'system',
        content: `🌐 Web search results for context (use this to answer accurately):\n\n${searchResults}\n\nUse the above search results to answer the user's question accurately. Always mention if you used web search data.`,
      });
      console.log('[Search] Results injected into context.');
    }
  }

  const client = getHFClient();
  const modelId = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct:novita';

  try {
    const completion = await client.chat.completions.create({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    return applyReplacements(reply.trim());
  } catch (err) {
    console.error('[AI] Hugging Face request failed:', err.message);
    throw new Error('The AI model is currently unavailable. Please try again later.');
  }
}

module.exports = { getAIResponse };
