import express from 'express';
import { getMe, getOrganizations } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', authMiddleware, getMe);
router.get('/organizations', getOrganizations);

export default router;
