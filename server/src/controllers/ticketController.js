import prisma from '../utils/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { analyzeTicketAndSuggest } from '../services/ai/aiService.js';

export const createTicket = async (req, res, next) => {
  try {
    const { subject, description, category, priority } = req.body;
    const user = req.user;

    if (!subject || !description) {
      throw new AppError('Subject and description are required', 400, 'INVALID_REQUEST');
    }

    // Auto-increment ticket number
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { ticketNumber: 'desc' },
    });
    const ticketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1045;

    // Create ticket in database
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        organizationId: user.organizationId,
        customerId: user.id,
        subject,
        description,
        category: category || 'Other',
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        messages: {
          create: {
            senderId: user.id,
            senderType: 'CUSTOMER',
            content: description,
          },
        },
        events: {
          create: {
            userId: user.id,
            eventType: 'TICKET_CREATED',
            metadata: JSON.stringify({ subject, category }),
          },
        },
      },
      include: {
        customer: true,
        messages: true,
      },
    });

    // Run AI Triage asynchronously or inline
    try {
      await analyzeTicketAndSuggest({
        organizationId: user.organizationId,
        ticketId: ticket.id,
        subject,
        description,
        customerName: user.name,
      });
    } catch (aiErr) {
      console.error('[AI Triage Error]', aiErr);
    }

    // Fetch updated ticket with AI data
    const finalTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        customer: true,
        assignedAgent: true,
        aiSuggestions: true,
        messages: true,
      },
    });

    res.status(201).json({
      success: true,
      data: finalTicket,
    });
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, priority, category, agentId, search } = req.query;

    const where = {
      organizationId: user.organizationId,
    };

    // Role-based visibility: Customers only see their own tickets
    if (user.role === 'CUSTOMER') {
      where.customerId = user.id;
    } else if (agentId) {
      where.assignedAgentId = agentId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search) {
      const searchNum = parseInt(search, 10);
      where.OR = [
        { subject: { contains: search } },
        { description: { contains: search } },
        { customer: { name: { contains: search } } },
        ...(isNaN(searchNum) ? [] : [{ ticketNumber: searchNum }]),
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignedAgent: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: tickets,
      count: tickets.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedAgent: true,
        messages: {
          include: { sender: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        events: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        aiSuggestions: {
          orderBy: { createdAt: 'desc' },
        },
        feedback: true,
        attachments: true,
      },
    });

    if (!ticket) {
      throw new AppError('The requested ticket does not exist.', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.organizationId !== user.organizationId) {
      throw new AppError('Forbidden: Organization access denied', 403, 'FORBIDDEN');
    }

    if (user.role === 'CUSTOMER' && ticket.customerId !== user.id) {
      throw new AppError('Forbidden: Customers can only access their own tickets', 403, 'FORBIDDEN');
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, category } = req.body;
    const user = req.user;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('The requested ticket does not exist.', 404, 'TICKET_NOT_FOUND');
    }

    if (existing.organizationId !== user.organizationId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const updateData = {};
    const events = [];

    if (status && status !== existing.status) {
      updateData.status = status;
      if (status === 'RESOLVED') updateData.resolvedAt = new Date();
      if (status === 'CLOSED') updateData.closedAt = new Date();
      events.push({
        userId: user.id,
        eventType: 'STATUS_CHANGED',
        metadata: JSON.stringify({ from: existing.status, to: status }),
      });
    }

    if (priority && priority !== existing.priority) {
      updateData.priority = priority;
      events.push({
        userId: user.id,
        eventType: 'PRIORITY_CHANGED',
        metadata: JSON.stringify({ from: existing.priority, to: priority }),
      });
    }

    if (category && category !== existing.category) {
      updateData.category = category;
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...updateData,
        events: {
          create: events,
        },
      },
      include: {
        customer: true,
        assignedAgent: true,
        events: true,
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

export const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const user = req.user;

    let agentName = 'Unassigned';
    if (agentId) {
      const agent = await prisma.user.findUnique({ where: { id: agentId } });
      if (agent) agentName = agent.name;
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        assignedAgentId: agentId || null,
        events: {
          create: {
            userId: user.id,
            eventType: 'TICKET_ASSIGNED',
            metadata: JSON.stringify({ assignedAgentId: agentId, assignedAgentName: agentName }),
          },
        },
      },
      include: {
        customer: true,
        assignedAgent: true,
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

export const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.ticket.delete({ where: { id } });
    res.json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const messages = await prisma.message.findMany({
      where: { ticketId: id },
      include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export const createTicketMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isAiGenerated } = req.body;
    const user = req.user;

    if (!content || !content.trim()) {
      throw new AppError('Message content is required', 400, 'INVALID_REQUEST');
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new AppError('The requested ticket does not exist.', 404, 'TICKET_NOT_FOUND');
    }

    const senderType = user.role === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

    const message = await prisma.message.create({
      data: {
        ticketId: id,
        senderId: user.id,
        senderType,
        content,
        isAiGenerated: !!isAiGenerated,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    // If agent replies, update ticket status to IN_PROGRESS or WAITING_FOR_CUSTOMER
    const newStatus = senderType === 'AGENT' ? 'WAITING_FOR_CUSTOMER' : 'IN_PROGRESS';
    await prisma.ticket.update({
      where: { id },
      data: {
        status: ticket.status === 'CLOSED' ? 'OPEN' : newStatus,
        events: {
          create: {
            userId: user.id,
            eventType: senderType === 'AGENT' ? 'AGENT_REPLIED' : 'CUSTOMER_REPLIED',
            metadata: JSON.stringify({ isAiGenerated: !!isAiGenerated }),
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export const submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const user = req.user;

    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_REQUEST');
    }

    const feedback = await prisma.customerFeedback.upsert({
      where: { ticketId: id },
      update: { rating, comment },
      create: {
        ticketId: id,
        userId: user.id,
        rating,
        comment,
      },
    });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};
