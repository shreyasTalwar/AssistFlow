import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { indexKnowledgeDocument } from '../services/knowledge/knowledgeService.js';
import vectorStore from '../services/pinecone/pineconeService.js';
import { analyzeTicketAndSuggest } from '../services/ai/aiService.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

const MAX_TITLE_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_CONTENT_LENGTH = 500_000;
const MIN_EXTRACTED_TEXT_LENGTH = 30;

/**
 * Handles both common pdf-parse styles:
 * - v1 / compatibility API: pdf(buffer) => { text }
 * - newer API: new PDFParse({ data: buffer }).getText()
 *
 * Important:
 * Do not use raw binary-to-text fallback extraction.
 * It can put PDF internals and unreadable data into your vector database.
 */
async function extractTextFromPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('PDF file is empty or invalid', 400, 'INVALID_PDF');
  }

  let extractedText = '';

  try {
    // pdf-parse v1-compatible CommonJS function
    if (typeof pdfModule === 'function') {
      const result = await pdfModule(buffer);
      extractedText = result?.text || '';
    }

    // pdf-parse newer API
    if (!extractedText.trim() && pdfModule?.PDFParse) {
      let parser;
      try {
        parser = new pdfModule.PDFParse({ data: buffer });
      } catch {
        parser = new pdfModule.PDFParse(buffer);
      }

      if (typeof parser.load === 'function') {
        await parser.load();
      }

      if (typeof parser.getText === 'function') {
        const result = await parser.getText();
        if (typeof result === 'string') {
          extractedText = result;
        } else {
          extractedText = result?.text || '';
        }
      }

      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  } catch (error) {
    console.error('[PDF extraction error]', error.message);
    throw new AppError(
      'Unable to read text from this PDF. Upload a text-based PDF or use OCR for scanned documents.',
      422,
      'PDF_TEXT_EXTRACTION_FAILED'
    );
  }

  const normalizedText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (normalizedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new AppError(
      'No readable text was found in this PDF. It may be scanned, password-protected, or image-based.',
      422,
      'PDF_HAS_NO_READABLE_TEXT'
    );
  }

  return normalizedText;
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanDocumentContent(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
}

async function indexAndReturnDocument(docId) {
  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: docId },
  });

  if (!doc) {
    throw new AppError('Document could not be found after creation', 500, 'DOCUMENT_NOT_FOUND');
  }

  try {
    await indexKnowledgeDocument(doc);
    return await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: 'INDEXED',
      },
    });
  } catch (error) {
    console.error('[Knowledge indexing error]', {
      documentId: doc.id,
      organizationId: doc.organizationId,
      message: error.message,
    });
    return await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: 'FAILED',
      },
    });
  }
}

export const getKnowledgeDocuments = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;

    const documents = await prisma.knowledgeDocument.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        version: true,
        status: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        fileContent: true,
      },
    });

    return res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

export const createKnowledgeDocument = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const createdBy = req.user.name || req.user.email || 'Admin';

    const title = cleanText(req.body.title, MAX_TITLE_LENGTH);
    const description = cleanText(req.body.description, MAX_DESCRIPTION_LENGTH);
    const content = cleanDocumentContent(req.body.content);
    const version = cleanText(req.body.version, 30) || '1.0';

    if (!title || !content) {
      throw new AppError('Title and content are required', 400, 'INVALID_REQUEST');
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId,
        title,
        description,
        fileContent: content,
        version,
        status: 'PROCESSING',
        createdBy,
      },
    });

    const updatedDoc = await indexAndReturnDocument(doc.id);

    return res.status(201).json({
      success: true,
      data: updatedDoc,
      message:
        updatedDoc.status === 'INDEXED'
          ? 'Knowledge document created and indexed successfully'
          : 'Document was saved, but indexing failed. Retry indexing from the admin panel.',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPdfDocument = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const createdBy = req.user.name || req.user.email || 'Admin';

    if (!req.file) {
      throw new AppError('A PDF file is required', 400, 'PDF_REQUIRED');
    }

    const isPdfMimeType = req.file.mimetype === 'application/pdf';
    const isPdfExtension = /\.pdf$/i.test(req.file.originalname || '');

    if (!isPdfMimeType || !isPdfExtension) {
      throw new AppError('Only PDF files are supported', 400, 'INVALID_FILE_TYPE');
    }

    const extractedText = await extractTextFromPdfBuffer(req.file.buffer);
    const fileTitle = (req.file.originalname || 'knowledge-document.pdf')
      .replace(/\.pdf$/i, '')
      .trim();

    const title = cleanText(req.body.title || fileTitle, MAX_TITLE_LENGTH);
    const description = cleanText(
      req.body.description || `Imported from ${req.file.originalname}`,
      MAX_DESCRIPTION_LENGTH
    );
    const version = cleanText(req.body.version, 30) || '1.0';

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId,
        title,
        description,
        fileContent: extractedText,
        version,
        status: 'PROCESSING',
        createdBy,
      },
    });

    const updatedDoc = await indexAndReturnDocument(doc.id);

    return res.status(201).json({
      success: true,
      data: updatedDoc,
      message:
        updatedDoc.status === 'INDEXED'
          ? 'PDF uploaded and indexed successfully'
          : 'PDF was saved, but vector indexing failed. Retry indexing from the admin panel.',
    });
  } catch (error) {
    console.error('[uploadPdfDocument error]', error);
    next(error);
  }
};

export const getKnowledgeDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const document = await prisma.knowledgeDocument.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!document) {
      throw new AppError('Knowledge document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    return res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteKnowledgeDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const document = await prisma.knowledgeDocument.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!document) {
      throw new AppError('Knowledge document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // First delete vectors, then remove database record.
    await vectorStore.deleteDocumentChunks(organizationId, document.id);
    await prisma.knowledgeDocument.delete({
      where: { id: document.id },
    });

    return res.json({
      success: true,
      message: 'Knowledge document and its vectors were removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const searchKnowledge = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const query = cleanText(req.body.query, 2_000);
    const requestedLimit = Number(req.body.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 10)
      : 5;

    if (!query) {
      throw new AppError('Search query is required', 400, 'INVALID_REQUEST');
    }

    const results = await vectorStore.searchSimilarChunks(
      organizationId,
      query,
      limit
    );

    return res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const chatWithAi = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    const query = cleanDocumentContent(req.body.query);

    if (!query) {
      throw new AppError('A chat message is required', 400, 'INVALID_REQUEST');
    }

    if (query.length > 10_000) {
      throw new AppError(
        'Chat message is too long. Please keep it under 10,000 characters.',
        400,
        'QUERY_TOO_LONG'
      );
    }

    // 1. Save user question into Database
    await prisma.chatbotMessage.create({
      data: {
        organizationId,
        userId,
        sender: 'user',
        text: query,
      },
    });

    const analysis = await analyzeTicketAndSuggest({
      organizationId,
      subject: 'Knowledge base chat',
      description: query,
      customerName: req.user.name || req.user.email || 'User',
    });

    const aiReplyText = analysis?.suggestedResponse || 'I could not generate a response.';
    const retrievedDocs = analysis?.retrievedKnowledge || [];

    // 2. Save AI reply into Database
    await prisma.chatbotMessage.create({
      data: {
        organizationId,
        userId,
        sender: 'ai',
        text: aiReplyText,
        retrievedDocs: JSON.stringify(retrievedDocs),
      },
    });

    return res.json({
      success: true,
      data: {
        reply: aiReplyText,
        retrievedKnowledge: retrievedDocs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatbotHistory = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    const dbMessages = await prisma.chatbotMessage.findMany({
      where: {
        organizationId,
        userId,
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = dbMessages.map((msg) => {
      let docs = [];
      if (msg.retrievedDocs) {
        try {
          docs = JSON.parse(msg.retrievedDocs);
        } catch (e) {}
      }
      return {
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        retrievedDocs: docs,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    return res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    next(error);
  }
};

export const clearChatbotHistory = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    await prisma.chatbotMessage.deleteMany({
      where: {
        organizationId,
        userId,
      },
    });

    return res.json({
      success: true,
      message: 'Chatbot conversation history cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};
