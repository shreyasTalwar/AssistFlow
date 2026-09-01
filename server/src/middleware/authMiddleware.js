import prisma from '../utils/prisma.js';
import { AppError } from './errorHandler.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const userEmail = req.headers['x-user-email'];
    let clerkUserId = req.headers['x-clerk-user-id'];
    let userId = req.headers['x-user-id'];

    let user = null;

    // 1. Match by Email if provided
    if (userEmail) {
      user = await prisma.user.findFirst({
        where: { email: userEmail },
        include: { organization: true },
      });
    }

    // 2. Match by Clerk User ID
    if (!user && clerkUserId) {
      user = await prisma.user.findUnique({
        where: { clerkUserId },
        include: { organization: true },
      });
    }

    // 3. Match by internal User ID
    if (!user && userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });
    }

    // 4. Default fallback if still no user
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: 'shreyastalwar334@gmail.com' },
        include: { organization: true },
      });
    }

    if (!user) {
      return next(new AppError('Unauthorized: User identity not found', 401, 'UNAUTHORIZED'));
    }

    req.user = user;
    req.organizationId = user.organizationId;
    next();
  } catch (error) {
    console.error('[authMiddleware error]', error);
    next(new AppError('Authentication failed', 401, 'UNAUTHORIZED'));
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient role permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
};
