/**
 * ragService.js
 * Retrieval-Augmented Generation pipeline.
 *
 * When a student asks a question:
 * 1. Determine if it's an LFU-specific question
 * 2. Retrieve relevant chunks from the knowledge base
 * 3. Build a grounded prompt with the retrieved evidence
 * 4. Generate an answer via OpenAI
 * 5. Return the answer + source citations
 */

const { retrieveRelevantChunks } = require('./knowledgeService');

// ── Kurdish ↔ English university term dictionary ─────────────────────────────
// Maps Kurdish Sorani terms to English equivalents for cross-lingual retrieval
const KURDISH_TO_ENGLISH = {
  // Departments
  'ئەندازیاری کۆمپیوتەر': 'computer engineering',
  'ئەندازیاری': 'engineering',
  'بەشی کۆمپیوتەر': 'computer science department',
  'بەشی': 'department',
  'کۆلێژی': 'college of',
  'زانکۆ': 'university',
  'زانكۆ': 'university',
  // People
  'سەرپەرشتیار': 'head supervisor department head',
  'مامۆستا': 'professor instructor',
  'دکتۆر': 'doctor professor',
  'دیکان': 'dean',
  // Admission
  'تۆمارکردن': 'admission registration enrollment',
  'بەڵگەنامە': 'documents requirements',
  'داواکاری': 'application',
  'قبوول': 'admission acceptance',
  // Academic
  'بەرنامە': 'program curriculum',
  'دەرسەکان': 'courses subjects',
  'کوردی': 'kurdish',
  'تۆپۆگرافی': 'topography',
  'ئایینی': 'religious',
  // General
  'زانیاری': 'information',
  'پەیوەندی': 'contact',
  'ئیمەیڵ': 'email',
  'ژمارەی تەلەفۆن': 'phone number',
  'پارێزراو': 'scholarship',
  'بوجە': 'tuition fees',
  // Arabic terms too
  'كلية': 'college',
  'قسم': 'department',
  'تسجيل': 'registration admission',
  'قبول': 'admission',
  'الجامعة': 'university',
  'مستمسكات': 'documents requirements',
  'المستندات': 'documents',
  // Events & News (Kurdish)
  'ئیڤێنت': 'event activity conference',
  'چالاکی': 'event activity',
  'چالاکییەکان': 'events activities',
  'کۆنفڕانس': 'conference seminar',
  'کۆنگرە': 'conference congress',
  'سیمینار': 'seminar workshop',
  'وۆرکشۆپ': 'workshop training',
  'ئاگادارکردنەوە': 'announcement news',
  'ڕاپۆرت': 'report announcement',
  'نوێترین': 'latest recent new',
  'دوایین': 'latest most recent',
  'ئەم دواییەی': 'recent latest',
  'ئەم هەفتەیە': 'this week',
  'ئەمساڵ': 'this year',
  'خەبەر': 'news',
  'ڕووداو': 'event news',
  // Events & News (Arabic)
  'فعالية': 'activity event',
  'فعاليات': 'activities events',
  'مؤتمر': 'conference',
  'ندوة': 'seminar',
  'ورشة عمل': 'workshop',
  'إعلان': 'announcement',
  'أخبار': 'news',
  'أحدث': 'latest',
  'الأنشطة': 'activities',
};

/**
 * Expand a query by appending English translations of Kurdish/Arabic terms.
 * This allows the English-indexed knowledge base to match Kurdish questions.
 */
function expandQueryForRetrieval(query) {
  let expanded = query;
  const additions = [];

  for (const [kurd, eng] of Object.entries(KURDISH_TO_ENGLISH)) {
    if (query.includes(kurd)) {
      additions.push(eng);
    }
  }

  if (additions.length > 0) {
    expanded = query + ' ' + additions.join(' ');
    console.log(`[RAG] Query expanded with: ${additions.join(', ')}`);
  }

  return expanded;
}

// Minimum similarity score to include a chunk as evidence
const MIN_RELEVANCE_SCORE = 0.30;

// Keywords that strongly suggest an LFU-related question
const LFU_TRIGGERS = [
  'lfu', 'lebanese french university', 'جامعة', 'زانكو', 'زانكۆ',
  'college', 'faculty', 'department', 'dean', 'admission', 'registration',
  'scholarship', 'campus', 'building', 'office', 'instructor', 'professor',
  'doctor', 'dr.', 'mr.', 'ms.', 'mrs.',
  'email', 'contact', 'phone', 'address', 'location',
  'program', 'curriculum', 'course', 'semester', 'gpa',
  'engineering', 'medical', 'law', 'education', 'nursing',
  'pharmacy', 'dentistry', 'business', 'administration',
  'computer science', 'it department', 'network',
  // ── Events, News, Announcements (THE MISSING TRIGGERS) ──
  'event', 'events', 'activity', 'activities', 'conference', 'conferences',
  'seminar', 'workshop', 'announcement', 'announcements', 'news',
  'latest', 'recent', 'upcoming', 'schedule', 'calendar',
  'lecture', 'guest lecture', 'ceremony', 'graduation',
  'research', 'publication', 'journal', 'paper',
  'lfu.edu', 'lfu.edu.krd',
  // Kurdish events
  'ئیڤێنت', 'چالاکی', 'چالاکییەکان', 'کۆنفڕانس', 'سیمینار',
  'وۆرکشۆپ', 'ئاگادارکردنەوە', 'نوێترین', 'دوایین', 'خەبەر', 'ڕووداو',
  'ئەم دواییەی', 'ئەم هەفتەیە',
  // Arabic events
  'فعالية', 'فعاليات', 'مؤتمر', 'ندوة', 'إعلان', 'أخبار', 'الأنشطة',
  // Kurdish
  'بەشی', 'کۆلێژی', 'پوختە', 'دەستنیشانکردن',
  // Arabic
  'كلية', 'قسم', 'تسجيل', 'قبول',
];

/**
 * Returns true if the question likely requires LFU knowledge base lookup.
 */
function isLFUQuery(message) {
  const lower = message.toLowerCase();
  return LFU_TRIGGERS.some((t) => lower.includes(t));
}

/**
 * Classify question intent:
 * - 'lfu'       → needs university knowledge base
 * - 'general'   → general knowledge question
 * - 'unknown'   → unclear
 */
function classifyIntent(message) {
  if (isLFUQuery(message)) return 'lfu';
  return 'general';
}

/**
 * Format retrieved chunks into a readable context block for the LLM.
 */
function formatContext(chunks) {
  if (!chunks || chunks.length === 0) return '';

  return chunks
    .map((chunk, i) => {
      const source = chunk.title || chunk.sourceUrl || 'LFU Website';
      const url = chunk.sourceUrl || '';
      const date = chunk.crawledAt ? `(indexed: ${chunk.crawledAt.slice(0, 10)})` : '';
      return `--- Source ${i + 1}: ${source} ${date}\nURL: ${url}\n${chunk.text}`;
    })
    .join('\n\n');
}

/**
 * Format sources for the frontend citation display.
 */
function formatSources(chunks) {
  const seen = new Set();
  return chunks
    .filter((c) => {
      if (seen.has(c.sourceUrl)) return false;
      seen.add(c.sourceUrl);
      return true;
    })
    .map((c) => ({
      title: c.title || 'LFU Website',
      url: c.sourceUrl,
      excerpt: c.text.slice(0, 200) + (c.text.length > 200 ? '...' : ''),
      indexedAt: c.crawledAt ? c.crawledAt.slice(0, 10) : null,
    }));
}

/**
 * Build the RAG system prompt with retrieved context.
 */
function buildRAGSystemPrompt(baseSystemPrompt, context, language = 'en') {
  const languageNote = language === 'ku'
    ? '\nRESPOND FULLY IN KURDISH SORANI (Arabic script). Preserve official names, emails, URLs exactly as they appear.'
    : language === 'ar'
      ? '\nRESPOND FULLY IN ARABIC. Preserve official names, emails, URLs exactly.'
      : '\nRespond in English.';

  const today = new Date().toISOString().slice(0, 10);

  return `${baseSystemPrompt}

═══════════════════════════════════════════════════════
UNIVERSITY KNOWLEDGE BASE — OFFICIAL RETRIEVED EVIDENCE
═══════════════════════════════════════════════════════
Today's date: ${today}

The passages below were retrieved from the official LFU website (lfu.edu.krd).
This IS real, official university information you must use to answer.

CRITICAL RULES:
1. NEVER say "I don't have live browsing" or "I cannot access the internet" when evidence is provided here. You HAVE this official university content — use it.
2. Use ONLY the evidence below for university-specific answers. Do NOT invent events, dates, names, emails, or any facts.
3. For EVENTS / NEWS questions: Look at the "indexed:" date on each source to identify the most recently indexed content. Present most recent first. State when the content was indexed. If no event info found, say: "Based on information indexed from lfu.edu.krd (last updated [date]), I could not find details about this specific event. For the latest updates, visit https://lfu.edu.krd"
4. NEVER invent event names, dates, or conference details.
5. Always cite source URLs.
${languageNote}

RETRIEVED EVIDENCE FROM lfu.edu.krd:
${context}
═══════════════════════════════════════════════════════`;
}

/**
 * Detect the language of a message.
 * Returns 'ku' for Kurdish Sorani, 'ar' for Arabic, 'en' for English.
 */
function detectLanguage(text) {
  // Arabic/Kurdish script Unicode range
  const arabicPattern = /[\u0600-\u06FF]/;
  if (!arabicPattern.test(text)) return 'en';

  // Rough heuristic: Kurdish Sorani uses specific letters not common in Arabic
  const kurdishSpecific = /[ێۆڕڵ]/;
  if (kurdishSpecific.test(text)) return 'ku';

  return 'ar';
}

/**
 * Main RAG function.
 * Called by the AI service when a message is received.
 *
 * @param {string} message - user's question
 * @param {string} baseSystemPrompt - the existing system prompt
 * @returns {{ useRAG: boolean, ragSystemPrompt: string|null, sources: Array, chunks: Array }}
 */
async function buildRAGContext(message, baseSystemPrompt) {
  const intent = classifyIntent(message);

  if (intent !== 'lfu') {
    return { useRAG: false, ragSystemPrompt: null, sources: [], chunks: [] };
  }

  try {
    // Expand Kurdish/Arabic query terms to English for cross-lingual retrieval
    const expandedQuery = expandQueryForRetrieval(message);

    // Timeout guard: if knowledge retrieval takes >6s, fall back gracefully
    const retrievalPromise = retrieveRelevantChunks(expandedQuery, 8);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Knowledge retrieval timeout')), 6000)
    );

    const chunks = await Promise.race([retrievalPromise, timeoutPromise]);

    // Filter by minimum relevance (keyword matches always included)
    const relevantChunks = chunks.filter(
      (c) => (c.score !== undefined ? c.score >= MIN_RELEVANCE_SCORE : true) ||
              c.keywordScore > 0
    );

    if (relevantChunks.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      const language = detectLanguage(message);
      const languageInstr = language === 'ku'
        ? 'Respond in Kurdish Sorani.'
        : language === 'ar' ? 'Respond in Arabic.' : 'Respond in English.';

      // Knowledge base has no relevant content — honest no-results response
      const noDataPrompt = `${baseSystemPrompt}

IMPORTANT: The student is asking about LFU (Lebanese French University).
The university knowledge base (indexed from lfu.edu.krd as of ${today}) was searched
but no relevant documents were found for this specific query.

INSTRUCTIONS:
- Do NOT say "I don't have live browsing access" or "I cannot access the internet".
- Do NOT invent any university information.
- Honestly explain that the indexed university knowledge base did not contain matching
  information for this specific question.
- Tell the student the knowledge base was last indexed on approximately ${today}.
- Suggest they visit https://lfu.edu.krd directly for the most up-to-date information,
  or check the university's official social media pages for recent events/announcements.
- ${languageInstr}`;

      return {
        useRAG: true,
        ragSystemPrompt: noDataPrompt,
        sources: [],
        chunks: [],
        noEvidence: true,
      };
    }

    const language = detectLanguage(message);
    const context = formatContext(relevantChunks);
    const sources = formatSources(relevantChunks);
    const ragSystemPrompt = buildRAGSystemPrompt(baseSystemPrompt, context, language);

    return { useRAG: true, ragSystemPrompt, sources, chunks: relevantChunks };
  } catch (err) {
    console.error('[RAG] Error building context:', err.message);
    // Fail gracefully — fall back to base system prompt
    return { useRAG: false, ragSystemPrompt: null, sources: [], chunks: [], error: err.message };
  }
}

module.exports = { buildRAGContext, classifyIntent, isLFUQuery, detectLanguage };
