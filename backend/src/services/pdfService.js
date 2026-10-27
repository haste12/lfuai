/**
 * pdfService.js
 * Downloads and extracts text from publicly accessible PDF documents.
 * Uses pdf-parse (no native binaries required for selectable-text PDFs).
 */

const axios = require('axios');
const pdfParseRaw = require('pdf-parse');
const pdfParse = typeof pdfParseRaw === 'function' ? pdfParseRaw : (pdfParseRaw.default || pdfParseRaw);
const crypto = require('crypto');

const USER_AGENT = 'LFU-AI-Bot/1.0 (+https://lfu.edu.krd; educational-assistant)';
const PDF_TIMEOUT_MS = 30000;
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB safety limit

/**
 * Downloads a PDF from a URL and returns its buffer.
 * Enforces a size limit to avoid memory exhaustion.
 */
async function downloadPdfBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: PDF_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT },
    maxRedirects: 5,
    validateStatus: (s) => s < 400,
    // Stream to check size early
    onDownloadProgress: (ev) => {
      if (ev.total && ev.total > MAX_PDF_SIZE_BYTES) {
        throw new Error(`PDF too large (${ev.total} bytes): ${url}`);
      }
    },
  });

  const buf = Buffer.from(res.data);
  if (buf.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(`PDF too large after download (${buf.length} bytes): ${url}`);
  }
  return buf;
}

/**
 * Extract text and metadata from a PDF buffer.
 * Returns null if the PDF appears to be a scanned image (no selectable text).
 */
async function parsePdfBuffer(buffer, sourceUrl) {
  try {
    const data = await pdfParse(buffer, {
      // Extract page-by-page info for citations
      pagerender: (pageData) => {
        return pageData.getTextContent().then((content) => {
          return content.items.map((item) => item.str).join(' ');
        });
      },
    });

    const rawText = data.text || '';

    // Heuristic: if very little text, PDF is likely scanned
    const wordsPerPage = rawText.split(/\s+/).length / Math.max(data.numpages, 1);
    const isScanned = rawText.trim().length < 50 || wordsPerPage < 5;

    if (isScanned) {
      console.warn(`[PDF] Scanned/image PDF detected (no selectable text): ${sourceUrl}`);
      return {
        url: sourceUrl,
        title: data.info?.Title || 'Untitled Document',
        text: '', // No text available without OCR
        isScanned: true,
        pageCount: data.numpages,
        author: data.info?.Author || null,
        crawledAt: new Date().toISOString(),
        contentHash: crypto.createHash('md5').update(buffer).digest('hex'),
      };
    }

    // Clean extracted text
    const cleanText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      url: sourceUrl,
      title: data.info?.Title || inferTitleFromUrl(sourceUrl),
      text: cleanText,
      isScanned: false,
      pageCount: data.numpages,
      author: data.info?.Author || null,
      crawledAt: new Date().toISOString(),
      contentHash: crypto.createHash('md5').update(cleanText).digest('hex'),
      metadata: {
        producer: data.info?.Producer,
        creator: data.info?.Creator,
        created: data.info?.CreationDate,
        modified: data.info?.ModDate,
      },
    };
  } catch (err) {
    throw new Error(`PDF parse error for ${sourceUrl}: ${err.message}`);
  }
}

/**
 * Download and parse a PDF from a URL.
 */
async function processPdfUrl(url) {
  console.log(`[PDF] Processing: ${url}`);
  const buffer = await downloadPdfBuffer(url);
  return parsePdfBuffer(buffer, url);
}

function inferTitleFromUrl(url) {
  try {
    const parts = url.split('/').filter(Boolean);
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename)
      .replace(/\.pdf$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return 'PDF Document';
  }
}

module.exports = { processPdfUrl, parsePdfBuffer, downloadPdfBuffer };
