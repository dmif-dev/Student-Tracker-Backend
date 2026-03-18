// backend/src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.issues
        });
      }
      res.status(400).json({ error: 'Validation failed' });
    }
  };
};