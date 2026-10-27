/**
 * embeddingService.js
 * Generates and compares text embeddings using Google's Gemini Embedding API.
 * Uses text-embedding-004 (768 dimensions) — fast, free tier available.
 * Stores/retrieves embeddings from Firestore (no separate vector DB needed).
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let _genAI = null;
function getClient() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

// Google's text-embedding-004: 768 dimensions, free-tier friendly
const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Generate an embedding vector for a text string.
 */
async function generateEmbedding(text) {
  const truncated = text.slice(0, 20000); // Safe limit for Google embeddings
  const client = getClient();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(truncated);
  return result.embedding.values; // float[]
}

/**
 * Batch-generate embeddings for multiple texts.
 * Google Embedding API doesn't have a native batch endpoint in the JS SDK,
 * so we parallelize with a concurrency limit of 5 to be respectful.
 */
async function generateEmbeddingsBatch(texts) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });
  const CONCURRENCY = 5;
  const results = [];

  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        const result = await model.embedContent(text.slice(0, 20000));
        return result.embedding.values;
      })
    );
    results.push(...batchResults);
  }
  return results;
}

/**
 * Cosine similarity between two embedding vectors.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Rank a list of chunk objects by semantic similarity to a query.
 */
async function semanticSearch(query, chunks, topK = 6) {
  if (!chunks || chunks.length === 0) return [];
  const queryEmbedding = await generateEmbedding(query);

  const scored = chunks
    .filter((c) => c.embedding && c.embedding.length > 0)
    .map((c) => ({
      ...c,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/**
 * Keyword / exact-match search on chunk text.
 */
function keywordSearch(query, chunks, topK = 4) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const scored = chunks.map((c) => {
    const haystack = (c.text + ' ' + (c.title || '') + ' ' + (c.url || '')).toLowerCase();
    let score = 0;
    for (const term of terms) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = haystack.match(regex);
      if (matches) score += matches.length;
    }
    return { ...c, keywordScore: score };
  });

  return scored
    .filter((c) => c.keywordScore > 0)
    .sort((a, b) => b.keywordScore - a.keywordScore)
    .slice(0, topK);
}

/**
 * Hybrid search: combines semantic + keyword results, deduplicates by chunkId.
 * Falls back to keyword-only if chunks don't have embeddings loaded.
 */
async function hybridSearch(query, chunks, topK = 8) {
  const hasEmbeddings = chunks.some((c) => c.embedding && c.embedding.length > 0);
  const keywordResults = keywordSearch(query, chunks, topK);

  if (!hasEmbeddings) {
    // Keyword-only mode (Vercel serverless — embeddings not loaded to save memory)
    console.log('[Search] Keyword-only mode (no embeddings in cache)');
    return keywordResults.slice(0, topK);
  }

  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, chunks, topK),
    Promise.resolve(keywordResults),
  ]);

  const seen = new Set();
  const combined = [];
  for (const chunk of [...keyword, ...semantic]) {
    const id = chunk.chunkId || chunk.url;
    if (!seen.has(id)) {
      seen.add(id);
      combined.push(chunk);
    }
  }
  return combined.slice(0, topK);
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  semanticSearch,
  keywordSearch,
  hybridSearch,
  EMBEDDING_MODEL,
};
