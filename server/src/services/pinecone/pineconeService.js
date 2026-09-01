// Production-Grade Multi-Tenant Vector Similarity & Pinecone Cloud RAG Store
import crypto from 'crypto';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_HOST = process.env.PINECONE_HOST;
const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10);
const PINECONE_TIMEOUT_MS = parseInt(process.env.PINECONE_TIMEOUT_MS || '20000', 10);
const PINECONE_METADATA_TEXT_LIMIT = parseInt(process.env.PINECONE_METADATA_TEXT_LIMIT || '12000', 10);

function getOrgHash(organizationId) {
  return crypto.createHash('md5').update(String(organizationId)).digest('hex').slice(0, 8);
}

function buildVectorId(organizationId, documentId, chunkId) {
  const hash = getOrgHash(organizationId);
  return `org:${hash}:doc:${documentId}:chunk:${chunkId}`;
}

class VectorStore {
  constructor() {
    // High-performance Map store for local development fallback
    this.vectors = new Map(); // key: vectorId, value: { id, organizationId, documentId, chunkId, title, text, embedding }
  }

  generateFallbackEmbedding(text) {
    const words = String(text ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const vector = new Array(EMBEDDING_DIMENSION).fill(0);

    words.forEach((word) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const position = Math.abs(hash) % EMBEDDING_DIMENSION;
      vector[position] += 1;
    });

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => val / magnitude);
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async callPineconeApi(endpoint, body, method = 'POST') {
    if (!PINECONE_API_KEY || !PINECONE_HOST || PINECONE_API_KEY.includes('mock')) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PINECONE_TIMEOUT_MS);

    try {
      const url = `${PINECONE_HOST.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
      const response = await fetch(url, {
        method,
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'X-Pinecone-API-Version': '2026-07',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = (await response.text()).slice(0, 1000);
        console.warn(`[Pinecone Cloud Warning ${response.status}] Endpoint ${endpoint}: ${errText}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      const msg = err.name === 'AbortError' ? `Timed out after ${PINECONE_TIMEOUT_MS}ms` : err.message;
      console.warn(`[Pinecone Cloud API Exception] ${endpoint}: ${msg}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async upsertChunks(organizationId, chunks) {
    if (!organizationId || !Array.isArray(chunks) || chunks.length === 0) {
      return false;
    }

    const pineconeVectors = [];

    for (const chunk of chunks) {
      const vectorId = buildVectorId(organizationId, chunk.documentId, chunk.chunkId);
      const embedding = this.generateFallbackEmbedding(chunk.text);
      const safeText = String(chunk.text ?? '').slice(0, PINECONE_METADATA_TEXT_LIMIT);

      // 1. Update local Map store
      this.vectors.set(vectorId, {
        id: vectorId,
        organizationId,
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        title: chunk.title,
        text: chunk.text,
        embedding,
      });

      // 2. Prepare Pinecone vector payload
      pineconeVectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          organizationId,
          documentId: chunk.documentId,
          chunkId: chunk.chunkId,
          title: chunk.title,
          text: safeText,
        },
      });
    }

    // 3. Upsert to live Pinecone Cloud
    const cloudRes = await this.callPineconeApi('vectors/upsert', {
      vectors: pineconeVectors,
      namespace: organizationId,
    });

    if (cloudRes) {
      console.info(`⚡ [Pinecone Cloud] Upserted ${pineconeVectors.length} vector(s) into namespace "${organizationId}"`);
    } else {
      console.info(`[VectorStore Local] Upserted ${chunks.length} chunk(s) into in-memory store for Org: ${organizationId}`);
    }

    return true;
  }

  async searchSimilarChunks(organizationId, queryText, topK = 3) {
    if (!organizationId || !queryText) return [];

    const queryEmbedding = this.generateFallbackEmbedding(queryText);

    // 1. Try querying live Pinecone Cloud vector index (documents/search or query)
    let cloudQueryRes = await this.callPineconeApi('documents/search', {
      query: { inputs: { text: queryText }, top_k: topK },
      namespace: organizationId,
    });

    if (!cloudQueryRes) {
      cloudQueryRes = await this.callPineconeApi('query', {
        vector: queryEmbedding,
        topK,
        namespace: organizationId,
        includeMetadata: true,
        filter: { organizationId },
      });
    }

    if (cloudQueryRes?.matches?.length > 0) {
      console.info(`⚡ [Pinecone Cloud] Retrieved ${cloudQueryRes.matches.length} matches from Cloud Index`);
      return cloudQueryRes.matches.map((m) => ({
        id: m.id,
        documentId: m.metadata?.documentId ?? m.id,
        title: m.metadata?.title || 'Knowledge Base Document',
        text: m.metadata?.text || '',
        score: Math.round((m.score || 0) * 100) / 100,
      }));
    }

    // 2. Fallback to local in-memory store with keyword stem & synonym boosting
    const orgVectors = [];
    for (const v of this.vectors.values()) {
      if (v.organizationId === organizationId) {
        orgVectors.push(v);
      }
    }

    if (orgVectors.length === 0) {
      return [];
    }

    const synonyms = {
      charged: ['charge', 'billing', 'billed', 'duplicate', 'payment', 'paid'],
      twice: ['duplicate', 'double', '2x', 'second'],
      refund: ['refunds', 'reimburse', 'reimbursement', 'money'],
      reset: ['2fa', 'password', 'login', 'security'],
      pay: ['payment', 'billing', 'invoice', 'charge'],
    };

    const words = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
    const searchTerms = new Set([...words]);
    words.forEach((w) => {
      if (synonyms[w]) synonyms[w].forEach((s) => searchTerms.add(s));
      if (w.length > 4) searchTerms.add(w.slice(0, 4));
    });

    const scored = orgVectors.map((v) => {
      const similarity = this.cosineSimilarity(queryEmbedding, v.embedding);
      const textLower = (v.title + ' ' + v.text).toLowerCase();

      let termMatches = 0;
      searchTerms.forEach((term) => {
        if (textLower.includes(term)) termMatches += 1;
      });

      const keywordBoost = termMatches * 0.18;
      const finalScore = similarity + keywordBoost;

      return {
        id: v.id,
        documentId: v.documentId,
        title: v.title,
        text: v.text,
        score: finalScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).filter((item) => item.score > 0.05);
  }

  async deleteDocumentChunks(organizationId, documentId) {
    if (!organizationId || !documentId) return;

    // 1. Delete from local Map store
    for (const [key, v] of this.vectors.entries()) {
      if (v.organizationId === organizationId && v.documentId === documentId) {
        this.vectors.delete(key);
      }
    }

    // 2. Delete from live Pinecone Cloud
    await this.callPineconeApi('vectors/delete', {
      namespace: organizationId,
      filter: { documentId: { $eq: documentId } },
    });
  }
}

const vectorStore = new VectorStore();
export default vectorStore;
