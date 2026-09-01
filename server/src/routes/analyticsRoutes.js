import express from 'express';
import {
  getOverview,
  getTicketMetrics,
  getAgentMetrics,
} from '../controllers/analyticsController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['AGENT', 'ADMIN']));

router.get('/overview', getOverview);
router.get('/tickets', getTicketMetrics);
router.get('/agents', getAgentMetrics);

export default router;
