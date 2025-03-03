import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
} 