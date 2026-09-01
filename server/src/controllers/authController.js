import prisma from '../utils/prisma.js';

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const allUsers = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        organizationId: true,
      },
    });

    const organizations = await prisma.organization.findMany();

    res.json({
      success: true,
      data: {
        user,
        organization: user.organization,
        availableUsers: allUsers,
        availableOrganizations: organizations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizations = async (req, res, next) => {
  try {
    const organizations = await prisma.organization.findMany();
    res.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
};
