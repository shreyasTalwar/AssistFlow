import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { analyzeTicketAndSuggest } from '../services/ai/aiService.js';

export const analyzeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = req.ticket;

    const result = await analyzeTicketAndSuggest({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      customerName: ticket.customer?.name,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(new AppError(error.message || 'AI service analysis failed', 500, 'AI_SERVICE_ERROR'));
  }
};

export const suggestResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = req.ticket;

    const result = await analyzeTicketAndSuggest({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      customerName: ticket.customer?.name,
    });

    res.json({
      success: true,
      data: {
        suggestedResponse: result.suggestedResponse,
        retrievedKnowledge: result.retrievedKnowledge,
        sentiment: result.sentiment,
        priority: result.priority,
        category: result.category,
      },
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to generate suggested response', 500, 'AI_SERVICE_ERROR'));
  }
};

export const summarizeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = req.ticket;

    // Fetch conversation thread for complete summary
    const messages = await prisma.message.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });

    const fullConversation = messages.map(m => `${m.senderType}: ${m.content}`).join('\n');
    const result = await analyzeTicketAndSuggest({
      organizationId: ticket.organizationId,
      ticketId: ticket.id,
      subject: ticket.subject,
      description: fullConversation || ticket.description,
      customerName: ticket.customer?.name,
    });

    res.json({
      success: true,
      data: {
        summary: result.summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptSuggestion = async (req, res, next) => {
  try {
    const { id, suggestionId } = req.params;
    const user = req.user;

    const updated = await prisma.aiSuggestion.update({
      where: { id: suggestionId },
      data: { accepted: true },
    });

    // Record audit log
    await prisma.ticketEvent.create({
      data: {
        ticketId: id,
        userId: user.id,
        eventType: 'AI_SUGGESTION_ACCEPTED',
        metadata: JSON.stringify({ suggestionId, type: updated.type }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
