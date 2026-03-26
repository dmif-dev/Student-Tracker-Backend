// backend/src/middleware/activity.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from './auth.middleware.js';

export const trackActivity = (action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function (data) {
      // Track activity after response is sent
      if (req.user?.id) {
        prisma.userActivity.create({
          data: {
            userId: req.user.id,
            action,
            metadata: {
              method: req.method,
              url: req.url,
              body: req.body,
              statusCode: res.statusCode
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          }
        }).catch(console.error);
      }
      return originalJson.call(this, data);
    };
    next();
  };
};