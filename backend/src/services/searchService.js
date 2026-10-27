/**
 * searchService.js
 * Web search using DuckDuckGo Instant Answer API — no API key required.
 * For LFU-specific event/news queries, restricts search to lfu.edu.krd domain.
 */

// General real-time triggers (non-LFU)
const SEARCH_TRIGGERS = [
  'weather', 'price', 'stock', 'who won', 'what happened',
  'right now', '2024', '2025', '2026',
];

// LFU-specific event/news triggers → should search within lfu.edu.krd
const LFU_EVENT_TRIGGERS = [
  'latest event', 'recent event', 'upcoming event', 'latest news',
  'latest activity', 'recent activity', 'latest conference', 'recent conference',
  'announcement', 'latest announcement', 'university event',
  // Kurdish
  'دوایین ئیڤێنت', 'نوێترین', 'دوایین چالاکی', 'ئاگادارکردنەوە',
  'دوایین خەبەر', 'ڕووداو', 'کۆنفڕانس',
  // Arabic
  'أحدث فعاليات', 'آخر أخبار', 'أحدث إعلان', 'فعاليات الجامعة',
];

/**
 * Returns true if the message needs a live web search.
 * LFU event questions are handled by RAG first; only fall through if RAG found nothing.
 */
function needsWebSearch(message) {
  const lower = message.toLowerCase();
  return SEARCH_TRIGGERS.some((trigger) => lower.includes(trigger));
}

/**
 * Returns true if this is an LFU-specific event/news question
 * that should search within lfu.edu.krd.
 */
function isLFUEventQuery(message) {
  const lower = message.toLowerCase();
  return LFU_EVENT_TRIGGERS.some((t) => lower.includes(t)) ||
    (lower.includes('lfu') && (lower.includes('event') || lower.includes('news') ||
      lower.includes('conference') || lower.includes('activity') || lower.includes('announcement')));
}

/**
 * Fetch and parse a specific LFU webpage for live event data.
 * Used as a fallback when indexed content has no relevant results.
 */
async function fetchLFUPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LFU-AI-Assistant/1.0 (+https://lfu.edu.krd; educational-assistant)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Simple text extraction: strip tags, collapse whitespace
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000); // Keep first 3000 chars

    return text || null;
  } catch (err) {
    console.warn(`[Search] fetchLFUPage failed for ${url}:`, err.message);
    return null;
  }
}

/**
 * Search DuckDuckGo for a query, optionally restricted to a site.
 */
async function searchWeb(query, siteRestrict = null) {
  try {
    const q = siteRestrict ? `site:${siteRestrict} ${query}` : query;
    const url =
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}` +
      `&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'LFU-AI-Assistant/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[Search] DuckDuckGo returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const parts = [];

    if (data.Answer) parts.push(`📌 Direct answer: ${data.Answer}`);
    if (data.Abstract) {
      parts.push(`📖 ${data.Abstract}`);
      if (data.AbstractURL) parts.push(`Source: ${data.AbstractURL}`);
    }
    if (Array.isArray(data.RelatedTopics)) {
      const snippets = data.RelatedTopics
        .filter((t) => t.Text && !t.Topics)
        .slice(0, 4)
        .map((t) => `• ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ''}`);
      if (snippets.length) parts.push(snippets.join('\n'));
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
  } catch (err) {
    console.warn('[Search] Web search failed:', err.message);
    return null;
  }
}

/**
 * Get live LFU event/news data by fetching the official news page.
 * Returns text content from lfu.edu.krd/news or /events pages.
 */
async function getLFULiveContent() {
  const newsUrls = [
    'https://lfu.edu.krd/news/',
    'https://lfu.edu.krd/events/',
    'https://lfu.edu.krd/activities/',
    'https://lfu.edu.krd/',
  ];

  for (const url of newsUrls) {
    const content = await fetchLFUPage(url);
    if (content && content.length > 200) {
      return { content, url };
    }
  }
  return null;
}

module.exports = { searchWeb, needsWebSearch, isLFUEventQuery, getLFULiveContent };
