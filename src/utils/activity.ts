import { prisma } from '../lib/prisma.js';

export const logActivity = async (userId: string | undefined, action: string, metadata: any) => {
  if (!userId) return;
  
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        action,
        metadata
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
