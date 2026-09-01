import express from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  assignTicket,
  deleteTicket,
  getTicketMessages,
  createTicketMessage,
  submitFeedback,
} from '../controllers/ticketController.js';
import {
  analyzeTicket,
  suggestResponse,
  summarizeTicket,
  acceptSuggestion,
} from '../controllers/aiController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { verifyTicketAccess } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Apply auth to all ticket routes
router.use(authMiddleware);

// Ticket list & create
router.route('/')
  .get(getTickets)
  .post(createTicket);

// Single ticket operations
router.route('/:id')
  .get(verifyTicketAccess, getTicketById)
  .patch(verifyTicketAccess, updateTicket)
  .delete(requireRole(['ADMIN']), deleteTicket);

// Messages
router.route('/:id/messages')
  .get(verifyTicketAccess, getTicketMessages)
  .post(verifyTicketAccess, createTicketMessage);

// Assignment
router.patch('/:id/assign', requireRole(['AGENT', 'ADMIN']), verifyTicketAccess, assignTicket);

// AI operations
router.post('/:id/analyze', requireRole(['AGENT', 'ADMIN']), verifyTicketAccess, analyzeTicket);
router.post('/:id/suggest-response', requireRole(['AGENT', 'ADMIN']), verifyTicketAccess, suggestResponse);
router.post('/:id/summarize', requireRole(['AGENT', 'ADMIN']), verifyTicketAccess, summarizeTicket);
router.patch('/:id/suggestions/:suggestionId/accept', requireRole(['AGENT', 'ADMIN']), verifyTicketAccess, acceptSuggestion);

// Customer Feedback
router.post('/:id/feedback', verifyTicketAccess, submitFeedback);

export default router;
