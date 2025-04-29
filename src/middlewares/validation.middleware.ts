import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { errorResponse } from '../utils/responseHandler';

export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request against schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // If validation passes, proceed to the controller
      return next();
    } catch (error) {
      // If validation fails, format the error messages
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return errorResponse(
          res,
          'Validation failed',
          400,
          { details: formattedErrors }
        );
      }
      
      // For other errors, pass to the global error handler
      return next(error);
    }
  }; 