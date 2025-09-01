import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { GetJobsRequest, Logger, JOB_STATES } from '@qontrol/core';

// Validation schemas
const getJobsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(500),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  states: Joi.array().items(Joi.string().valid(...JOB_STATES)),
  all: Joi.boolean().default(false),
  search: Joi.string().max(500).empty(),
  searchType: Joi.string().valid('name', 'data', 'id').optional(),
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
    sortOrder: value.sortOrder,
    states: value.states,
    all: value.all,
    search: value.search,
    searchType: value.searchType,
  };

  req.validatedQuery = params;
  next();
};

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const logger = Logger.getInstance();

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
  const logger = Logger.getInstance();

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
