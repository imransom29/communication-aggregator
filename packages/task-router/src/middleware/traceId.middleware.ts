import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithTrace extends Request {
  traceId: string;
}

export const traceIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  (req as RequestWithTrace).traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
};
