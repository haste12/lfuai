const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  SYSTEM_PROMPT,
  getGreetingResponse,
  CREATOR_RESPONSE,
  PRESIDENT_RESPONSE,
  GREETINGS,
  CREATOR_TRIGGERS,
  REPLACEMENTS,
} = require('../data/prompts');

// Lazy singleton
let _genAI = null;
function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_gemini')) {
      throw new Error('GEMINI_API_KEY is not set in your .env file.');
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

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

async function getAIResponse(message, userName, history = []) {
  const predefined = getPredefinedResponse(message, userName);
  if (predefined) return predefined;

  // Build clean alternating history for Gemini's startChat API
  // Skip the welcome message and any messages without text
  const rawHistory = [];
  if (Array.isArray(history)) {
    for (const msg of history) {
      if (!msg.text || msg.id === 'welcome') continue;
      const role = msg.role === 'bot' ? 'model' : 'user';
      rawHistory.push({ role, parts: [{ text: msg.text }] });
    }
  }

  // Gemini requires history to start with 'user' and strictly alternate user/model
  while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
    rawHistory.shift();
  }

  // Merge consecutive same-role turns
  const chatHistory = [];
  for (const turn of rawHistory) {
    const last = chatHistory[chatHistory.length - 1];
    if (last && last.role === turn.role) {
      last.parts[0].text += '\n' + turn.parts[0].text;
    } else {
      chatHistory.push({ role: turn.role, parts: [{ text: turn.parts[0].text }] });
    }
  }

  // Gemini's startChat history must end with 'model' turn
  // The current user message is sent separately via chat.sendMessage()
  while (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role !== 'model') {
    chatHistory.pop();
  }

  const genAI = getGenAI();
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];

  const contextInstruction = '\n\nIMPORTANT: Always maintain full conversation context. When the user says something vague like "more", "continue", "go on", or asks a follow-up question, always refer back to the previous messages in this conversation and continue from where you left off. Never lose track of what was previously discussed.';

  const customizedSystemPrompt = userName
    ? SYSTEM_PROMPT + `\n\nThe user's name is ${userName}. Address them by name occasionally.` + contextInstruction
    : SYSTEM_PROMPT + contextInstruction;

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: customizedSystemPrompt,
      });

      // Use startChat() with history for proper multi-turn conversation memory
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      // Send current message into the live chat session
      const result = await chat.sendMessage(message);
      const reply = result.response.text();
      return applyReplacements(reply);

    } catch (err) {
      console.warn(`[AI] Model ${modelName} failed:`, err.message);
      lastError = err;
      // Fallback to the next model if the service is overloaded (503) or rate-limited (429)
      if (!err.message.includes('503') && !err.message.includes('429') && !err.message.includes('Quota')) {
        break;
      }
    }
  }

  throw lastError || new Error('All AI models are currently overloaded. Please try again later.');
}

module.exports = { getAIResponse };
