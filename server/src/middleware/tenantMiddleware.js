import prisma from '../utils/prisma.js';
import { AppError } from './errorHandler.js';

export const verifyTicketAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedAgent: true,
        organization: true,
      },
    });

    if (!ticket) {
      return next(new AppError('The requested ticket does not exist.', 404, 'TICKET_NOT_FOUND'));
    }

    // 1. Enforce Multi-tenant isolation: Ticket must belong to the user's organization
    if (ticket.organizationId !== user.organizationId) {
      return next(new AppError('Forbidden: Access denied to foreign organization resource', 403, 'FORBIDDEN'));
    }

    // 2. Enforce Role-based ticket access:
    // Customers can ONLY view/access tickets that they created
    if (user.role === 'CUSTOMER' && ticket.customerId !== user.id) {
      return next(new AppError('Forbidden: Customers can only access their own tickets', 403, 'FORBIDDEN'));
    }

    req.ticket = ticket;
    next();
  } catch (error) {
    next(error);
  }
};
