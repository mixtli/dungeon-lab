import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.mjs';
import { IncomingMessage, ServerResponse } from 'http';

// Create a custom morgan token for request body
morgan.token('body', (req: Request) => {
  if (req.body && Object.keys(req.body).length > 0 && !req.is('multipart/form-data')) {
    return JSON.stringify(req.body);
  }
  return '';
});

// Create a custom format that includes all the information we want
const morganFormat = (tokens: morgan.TokenIndexer<IncomingMessage, ServerResponse>, req: IncomingMessage, res: ServerResponse) => {
  const expressReq = req as Request;
  const expressRes = res as Response;
  
  const status = parseInt(tokens.status?.(req, res) || '0');
  const logLevel = status >= 400 ? 'error' : 'info';
  
  const logMessage = [
    `[${tokens.method?.(req, res) || 'UNKNOWN'}]`,
    tokens.url?.(req, res) || 'UNKNOWN',
    status,
    `${tokens['response-time']?.(req, res) || '0'} ms`,
    '-',
    tokens['user-agent']?.(req, res) || 'UNKNOWN',
    tokens.body?.(req, res) ? `- body: ${tokens.body(req, res)}` : ''
  ].join(' ');

  const logData: Record<string, unknown> = {
    method: tokens.method?.(req, res) || 'UNKNOWN',
    url: tokens.url?.(req, res) || 'UNKNOWN',
    status,
    duration: parseFloat(tokens['response-time']?.(req, res) || '0'),
    userAgent: tokens['user-agent']?.(req, res) || 'UNKNOWN'
  };

  // In development mode, add extra debug info for 4xx errors
  if (process.env.NODE_ENV !== 'production' && status >= 400 && status < 500) {
    // Add request details
    logData.requestBody = expressReq.body;
    logData.requestHeaders = expressReq.headers;
    logData.requestQuery = expressReq.query;
    logData.requestParams = expressReq.params;

    // Add response details if available
    const resBody = expressRes.locals?.error || expressRes.locals?.validationErrors;
    if (resBody) {
      logData.responseBody = resBody;
    }

    // Add stack trace if available
    const error = expressRes.locals?.error;
    if (error?.stack) {
      logData.stack = error.stack;
    }

    logger[logLevel](logMessage, logData);
    // Log detailed debug info separately
    logger.debug('Detailed request information:', {
      request: {
        body: expressReq.body,
        headers: expressReq.headers,
        query: expressReq.query,
        params: expressReq.params
      },
      response: resBody,
      stack: error?.stack
    });
  } else {
    logger[logLevel](logMessage, logData);
  }

  return null;
};

// Export the morgan middleware with our custom format
export const requestLogger = morgan(morganFormat, {
  // Skip logging for successful health check endpoints to reduce noise
  skip: (req: IncomingMessage, res: ServerResponse) => {
    const expressReq = req as Request;
    return expressReq.url === '/api/health' && res.statusCode === 200;
  }
}); 