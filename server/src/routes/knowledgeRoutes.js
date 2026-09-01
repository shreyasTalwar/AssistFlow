import express from 'express';
import {
  getKnowledgeDocuments,
  createKnowledgeDocument,
  uploadPdfDocument,
  getKnowledgeDocumentById,
  deleteKnowledgeDocument,
  searchKnowledge,
  chatWithAi,
  getChatbotHistory,
  clearChatbotHistory,
} from '../controllers/knowledgeController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { uploadSinglePdf } from '../middleware/pdfUpload.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .get(getKnowledgeDocuments)
  .post(requireRole(['AGENT', 'ADMIN']), createKnowledgeDocument);

router.post('/upload-pdf', requireRole(['AGENT', 'ADMIN']), uploadSinglePdf, uploadPdfDocument);
router.post('/search', searchKnowledge);
router.post('/chat', chatWithAi);

router.route('/chat/history')
  .get(getChatbotHistory)
  .delete(clearChatbotHistory);

router.route('/:id')
  .get(getKnowledgeDocumentById)
  .delete(requireRole(['ADMIN']), deleteKnowledgeDocument);

export default router;
