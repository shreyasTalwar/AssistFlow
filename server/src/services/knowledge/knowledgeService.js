import prisma from '../../utils/prisma.js';
import vectorStore from '../pinecone/pineconeService.js';

const DEFAULT_MAX_CHUNK_LENGTH = 900;
const DEFAULT_OVERLAP_LENGTH = 150;
const UPSERT_BATCH_SIZE = 100;
const MAX_DOCUMENT_CHARACTERS = 2_000_000;

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function assertChunkOptions(maxChunkLength, overlap) {
  if (!Number.isInteger(maxChunkLength) || maxChunkLength < 100) {
    throw new TypeError('maxChunkLength must be an integer of at least 100.');
  }

  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= maxChunkLength) {
    throw new RangeError('overlap must be a non-negative integer smaller than maxChunkLength.');
  }
}

/**
 * Splits text into character-bounded chunks, preferring paragraph, sentence,
 * then word boundaries. The overlap is measured in characters, not words.
 */
export function splitIntoChunks(
  text,
  maxChunkLength = DEFAULT_MAX_CHUNK_LENGTH,
  overlap = DEFAULT_OVERLAP_LENGTH,
) {
  assertChunkOptions(maxChunkLength, overlap);

  const source = normalizeText(text);
  if (!source) return [];

  const chunks = [];
  let start = 0;

  while (start < source.length) {
    let end = Math.min(start + maxChunkLength, source.length);

    if (end < source.length) {
      const window = source.slice(start, end + 1);
      const paragraphBreak = window.lastIndexOf('\n\n');
      const sentenceBreak = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('! '),
        window.lastIndexOf('? '),
      );
      const wordBreak = window.lastIndexOf(' ');
      const breakAt = Math.max(paragraphBreak, sentenceBreak, wordBreak);

      // Avoid creating tiny chunks merely to preserve a boundary.
      if (breakAt >= Math.floor(maxChunkLength * 0.5)) {
        end = start + breakAt + (paragraphBreak === breakAt ? 0 : 1);
      }
    }

    const chunk = source.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= source.length) break;

    // Prevent an infinite loop when a boundary lands too near `start`.
    start = Math.max(end - overlap, start + 1);
    while (source[start] === ' ') start += 1;
  }

  return chunks;
}

function buildChunks(document, rawChunks) {
  return rawChunks.map((text, index) => ({
    documentId: document.id,
    // Stable IDs allow a re-index operation to overwrite an existing vector.
    chunkId: `${document.id}:chunk:${index + 1}`,
    title: normalizeText(document.title) || 'Untitled knowledge document',
    text,
  }));
}

function batch(items, batchSize) {
  const batches = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
}

async function setDocumentStatus(documentId, status) {
  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { status },
  });
}

/**
 * Indexes one document into its organization-scoped vector namespace.
 * The vector-store implementation should delete stale document vectors before
 * re-indexing, or support replacing vectors by the stable `chunkId` above.
 */
export async function indexKnowledgeDocument(document, options = {}) {
  const {
    maxChunkLength = DEFAULT_MAX_CHUNK_LENGTH,
    overlap = DEFAULT_OVERLAP_LENGTH,
    batchSize = UPSERT_BATCH_SIZE,
  } = options;

  if (!document?.id) throw new Error('A knowledge document with an id is required.');
  if (!document?.organizationId) throw new Error('document.organizationId is required.');
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError('batchSize must be a positive integer.');
  }

  const fileContent = normalizeText(document.fileContent);
  if (!fileContent) {
    await setDocumentStatus(document.id, 'FAILED');
    throw new Error(`Knowledge document ${document.id} has no indexable content.`);
  }
  if (fileContent.length > MAX_DOCUMENT_CHARACTERS) {
    await setDocumentStatus(document.id, 'FAILED');
    throw new Error(`Knowledge document ${document.id} exceeds the ${MAX_DOCUMENT_CHARACTERS}-character indexing limit.`);
  }

  try {
    await setDocumentStatus(document.id, 'INDEXING');

    const rawChunks = splitIntoChunks(fileContent, maxChunkLength, overlap);
    const chunks = buildChunks(document, rawChunks);

    if (!chunks.length) {
      throw new Error(`Knowledge document ${document.id} produced no chunks.`);
    }

    if (typeof vectorStore.deleteDocumentChunks === 'function') {
      await vectorStore.deleteDocumentChunks(document.organizationId, document.id);
    }

    for (const chunkBatch of batch(chunks, batchSize)) {
      await vectorStore.upsertChunks(document.organizationId, chunkBatch);
    }

    await setDocumentStatus(document.id, 'INDEXED');
    console.info('[Knowledge Index] Document indexed', {
      documentId: document.id,
      organizationId: document.organizationId,
      chunks: chunks.length,
    });

    return chunks.length;
  } catch (error) {
    console.error('[Knowledge Index] Failed to index document', {
      documentId: document.id,
      organizationId: document.organizationId,
      message: error?.message,
    });

    try {
      await setDocumentStatus(document.id, 'FAILED');
    } catch (statusError) {
      console.error('[Knowledge Index] Failed to set FAILED status', {
        documentId: document.id,
        message: statusError?.message,
      });
    }

    throw error;
  }
}

/**
 * Re-indexes every stored knowledge document. Failed documents are recorded but
 * do not stop later documents from being indexed. Returns a useful job summary.
 */
export async function indexAllOrgDocuments(options = {}) {
  const docs = await prisma.knowledgeDocument.findMany({
    select: {
      id: true,
      organizationId: true,
      title: true,
      fileContent: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const results = {
    total: docs.length,
    indexed: 0,
    failed: 0,
    chunks: 0,
    failures: [],
  };

  console.info('[Knowledge Index] Startup indexing started', { documents: docs.length });

  for (const document of docs) {
    try {
      const chunkCount = await indexKnowledgeDocument(document, options);
      results.indexed += 1;
      results.chunks += chunkCount;
    } catch (error) {
      results.failed += 1;
      results.failures.push({
        documentId: document.id,
        title: document.title,
        error: error?.message || 'Unknown indexing error',
      });
    }
  }

  console.info('[Knowledge Index] Startup indexing completed', results);
  return results;
}

/**
 * Optional health-check helper. Unlike the original fixed "refund" query, this
 * verifies retrieval per organization and returns results to the caller.
 */
export async function verifyOrganizationRetrieval(organizationId, query = 'support policy') {
  if (!organizationId) throw new Error('organizationId is required.');

  const results = await vectorStore.searchSimilarChunks(
    organizationId,
    normalizeText(query, 500) || 'support policy',
    1,
  );

  const match = Array.isArray(results) ? results[0] : null;
  return {
    found: Boolean(match),
    documentId: match?.documentId ?? null,
    title: match?.title ?? null,
    excerpt: match?.text ? `${match.text.slice(0, 180)}${match.text.length > 180 ? '...' : ''}` : null,
    score: Number.isFinite(Number(match?.score)) ? Number(match.score) : null,
  };
}
