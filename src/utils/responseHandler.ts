import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const successResponse = (
  res: Response,
  data: any,
  statusCode: number = 200,
  message: string = 'Success'
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  error: any = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
};

export const paginatedResponse = (
  res: Response,
  data: any,
  meta: PaginationMeta,
  statusCode: number = 200,
  message: string = 'Success'
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
}; 