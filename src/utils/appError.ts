/**
 * Custom application error class
 * Extends the built-in Error class with additional properties
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  details?: any;

  /**
   * Create a new AppError
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param details - Optional additional error details
   */
  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // All AppErrors are operational errors
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
} 