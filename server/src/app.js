import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { indexAllOrgDocuments } from './services/knowledge/knowledgeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite client
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Observability & Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI Support Platform API',
  });
});

// Mount Routes
app.use('/api/users', authRoutes);
app.use('/api/organizations', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Centralized error handler
app.use(errorHandler);

// Start server & index vector knowledge base
app.listen(PORT, async () => {
  console.log(`\n🚀 AI Support Platform Server running on http://localhost:${PORT}`);
  try {
    await indexAllOrgDocuments();
    console.log('⚡ Pinecone RAG Vector Store ready and indexed for multi-tenant retrieval\n');
  } catch (err) {
    console.warn('Vector indexing warning:', err.message);
  }
});

export default app;
