import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { GetJobsRequest } from '../types/api';
import { logger } from '../config/logger';

// Validation schemas
const getJobsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(500),
  sortBy: Joi.string().valid('createdAt', 'processedOn', 'finishedOn', 'duration', 'state', 'name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  states: Joi.array().items(Joi.string().valid('waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'waiting-children')),
  'timeRange.field': Joi.string().valid('createdAt', 'processedOn', 'finishedOn'),
  'timeRange.start': Joi.date().iso(),
  'timeRange.end': Joi.date().iso(),
  minDuration: Joi.number().integer().min(0),
  minAttempts: Joi.number().integer().min(0),
  search: Joi.string().max(500),
});

// Request validation middleware
export const validateGetJobs = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = getJobsSchema.validate(req.query, {
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      message: 'Invalid query parameters',
      code: 'VALIDATION_ERROR',
      details: error.details,
    });
  }

  // Transform flat query params to nested structure
  const params: GetJobsRequest = {
    page: value.page,
    pageSize: value.pageSize,
    sortBy: value.sortBy,
    sortOrder: value.sortOrder,
    states: value.states,
    minDuration: value.minDuration,
    minAttempts: value.minAttempts,
    search: value.search,
  };

  // Handle timeRange nesting
  if (value['timeRange.field']) {
    params.timeRange = {
      field: value['timeRange.field'],
      start: value['timeRange.start'] ? new Date(value['timeRange.start']) : undefined,
      end: value['timeRange.end'] ? new Date(value['timeRange.end']) : undefined,
    };
  }

  req.validatedQuery = params;
  next();
};

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    params: req.params,
  });

  res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      query: req.query,
    });
  });

  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: GetJobsRequest;
    }
  }
}
