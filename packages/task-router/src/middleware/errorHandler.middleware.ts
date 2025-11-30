import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import { RequestWithTrace } from './traceId.middleware';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const traceId = (req as RequestWithTrace).traceId || 'unknown';
  const logger = createLogger(traceId);

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    traceId
  });
};
