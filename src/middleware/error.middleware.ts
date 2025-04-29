import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default values
  let statusCode = 500;
  let status = 'error';
  let message = 'Something went wrong';
  let details = undefined;
  let stack = undefined;

  // If it's our AppError, use its properties
  if ('statusCode' in err) {
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
    details = err.details;
  } else {
    // For unhandled errors, use generic message in production
    message = err.message;
  }

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development') {
    stack = err.stack;
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, { path: req.path, stack: err.stack });
  } else {
    logger.warn(`${statusCode} - ${message}`, { path: req.path });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    status,
    message,
    details,
    ...(stack && { stack }),
  });
}; 