/**
 * embeddingService.js
 * Generates and compares text embeddings using the OpenAI Embeddings API.
 * Stores/retrieves embeddings from Firestore (no separate vector DB needed).
 * Uses cosine similarity for semantic search.
 */

const OpenAI = require('openai');

let _client = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, cost-effective

/**
 * Generate an embedding vector for a text string.
 * Truncates input to avoid token limits (8191 tokens max for this model).
 */
async function generateEmbedding(text) {
  const truncated = text.slice(0, 25000); // ~6250 tokens, well within limit
  const client = getClient();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
  });
  return res.data[0].embedding; // float[]
}

/**
 * Batch-generate embeddings for multiple texts.
 * OpenAI supports up to 2048 inputs per call; we batch safely at 100.
 */
async function generateEmbeddingsBatch(texts) {
  const client = getClient();
  const results = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 25000));
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    results.push(...res.data.map((d) => d.embedding));
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
 * Each chunk must have an `embedding` field (float[]).
 *
 * @param {string} query
 * @param {Array<{embedding: number[], ...}>} chunks
 * @param {number} topK
 * @returns {Array} top-K chunks sorted by score descending
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
 * Useful for instructor names, emails, course codes, department names.
 */
function keywordSearch(query, chunks, topK = 4) {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const scored = chunks.map((c) => {
    const haystack = (c.text + ' ' + (c.title || '') + ' ' + (c.url || '')).toLowerCase();
    let score = 0;
    for (const term of terms) {
      // Count occurrences
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
 */
async function hybridSearch(query, chunks, topK = 8) {
  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, chunks, topK),
    Promise.resolve(keywordSearch(query, chunks, Math.ceil(topK / 2))),
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
