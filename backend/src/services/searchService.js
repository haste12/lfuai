/**
 * searchService.js
 * Free web search using DuckDuckGo Instant Answer API — no API key required.
 */

// Keywords that suggest the user wants real-time / current information
const SEARCH_TRIGGERS = [
  'latest', 'current', 'today', 'now', 'recent', 'news',
  'weather', 'price', 'stock', 'who won', 'what happened',
  'right now', 'this week', 'this month', 'this year',
  '2024', '2025', '2026',
];

/**
 * Returns true if the message likely needs a live web search.
 */
function needsWebSearch(message) {
  const lower = message.toLowerCase();
  return SEARCH_TRIGGERS.some((trigger) => lower.includes(trigger));
}

/**
 * Searches DuckDuckGo and returns a short text summary of the results.
 * @param {string} query - The search query
 * @returns {Promise<string|null>} - Summary text or null if nothing found
 */
async function searchWeb(query) {
  try {
    const url =
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}` +
      `&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'LFU-AI-Assistant/1.0' },
    });

    if (!res.ok) {
      console.warn(`[Search] DuckDuckGo returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const parts = [];

    // Direct answer (e.g. "The capital of France is Paris")
    if (data.Answer) {
      parts.push(`📌 Direct answer: ${data.Answer}`);
    }

    // Abstract (Wikipedia-style summary)
    if (data.Abstract) {
      parts.push(`📖 ${data.Abstract}`);
      if (data.AbstractURL) parts.push(`Source: ${data.AbstractURL}`);
    }

    // Related topic snippets
    if (Array.isArray(data.RelatedTopics)) {
      const snippets = data.RelatedTopics
        .filter((t) => t.Text && !t.Topics) // skip nested groups
        .slice(0, 4)
        .map((t) => `• ${t.Text}`);
      if (snippets.length) parts.push(snippets.join('\n'));
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  } catch (err) {
    console.warn('[Search] Web search failed:', err.message);
    return null;
  }
}

module.exports = { searchWeb, needsWebSearch };
