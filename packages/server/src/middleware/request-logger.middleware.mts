import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';
import { nanoid } from 'nanoid';

// Helper function to check if content is binary data
function isBinaryContent(req: Request): boolean {
  return Boolean(
    req.is('multipart/form-data') ||
      req.is('image/*') ||
      req.is('application/octet-stream') ||
      req.is('audio/*') ||
      req.is('video/*') ||
      req.is('application/pdf') ||
      req.is('application/zip') ||
      req.is('application/x-7z-compressed')
  );
}

// Create a custom morgan token for request body
morgan.token('body', (req: Request) => {
  if (req.body && Object.keys(req.body).length > 0 && !isBinaryContent(req)) {
    return JSON.stringify(req.body);
  }
  return '';
});

// Create a custom morgan token for request id
morgan.token('request-id', (req: Request, res: Response) => {
  return res.locals.requestId;
});

// Create a custom morgan token for user id (if authenticated)
morgan.token('user-id', (req: Request) => {
  return req.session?.user?.id || '-';
});

morgan.token('error-message', (req: Request, res: Response) => {
  const error = res.locals?.error;
  if (error?.message) {
    return error.message;
  }
  return '';
});

// Extend Express Request interface to include locals
// Using module augmentation instead of namespace
declare module 'express' {
  interface Request {
    locals?: Record<string, unknown>;
  }
}

// Create the Express middleware function
export function requestLoggerMiddleware() {
  const logFormat =
    ':method :url :status :response-time ms - :res[content-length] - :body - [req-id: :request-id] - [user: :user-id] :error-message';
  return [
    // Assign request ID
    (req: Request, res: Response, next: NextFunction) => {
      res.locals.requestId = nanoid(8);
      next();
    },
    // Use Morgan for request logging
    morgan(logFormat, {
      skip: (req) => req.url === '/health' || req.url === '/favicon.ico',
      stream: {
        write: (message: string) => {
          // Use info level for HTTP request logs
          logger.info(message.trim());
        }
      }
    }),
    // Log when response completes or errors
    (req: Request, res: Response, next: NextFunction) => {
      const expressReq = req;
      const expressRes = res;

      // If req.locals doesn't exist, initialize it
      if (!expressReq.locals) {
        expressReq.locals = {};
      }

      const originalEnd = res.end;
      const originalSend = res.send;

      // Override send to capture response data
      res.send = function (body: unknown) {
        (res.locals as Record<string, unknown>).responseBody = body;
        return originalSend.call(this, body);
      };

      // Type for res.end method
      type EndCallback = (() => void) | undefined;
      type EndChunk = unknown;

      // Final log on response completion
      res.end = function (
        chunk?: EndChunk,
        encoding?: BufferEncoding | EndCallback,
        callback?: EndCallback
      ) {
        const start = (expressReq.locals?.startAt as number) || Date.now();
        const duration = Date.now() - start;
        const status = expressRes.statusCode;
        const method = expressReq.method;
        const url = expressReq.originalUrl;
        const requestId = (expressRes.locals as Record<string, unknown>).requestId as string;
        const userId = expressReq.session?.user?.id;
        const logMessage = `Response completed: ${method} ${url} ${status} ${duration}ms [req-id: ${requestId}] [user: ${
          userId || '-'
        }]`;

        let logLevel: 'error' | 'warn' | 'info' | 'http' = 'http';
        if (status >= 500) {
          logLevel = 'error';
        } else if (status >= 400) {
          logLevel = 'warn';
        }

        const logData: Record<string, unknown> = {
          method,
          url,
          status,
          duration,
          requestId,
          userId
        };

        // In development mode, add extra debug info for 4xx errors
        if (process.env.NODE_ENV !== 'production' && status >= 400 && status < 500) {
          // Add request details if it's not binary data
          const isBinaryData = isBinaryContent(expressReq);

          if (!isBinaryData) {
            logData.requestBody = expressReq.body;
          } else {
            logData.requestBody = '[Binary data not logged]';
          }

          logData.requestHeaders = expressReq.headers;
          logData.requestQuery = expressReq.query;
          logData.requestParams = expressReq.params;

          // Add response details if available
          const resBody =
            (expressRes.locals as Record<string, unknown>)?.error ||
            (expressRes.locals as Record<string, unknown>)?.validationErrors;
          if (resBody) {
            logData.responseBody = resBody;
          }

          // Add stack trace if available
          const error = (expressRes.locals as Record<string, unknown>)?.error as Error;
          if (error?.stack) {
            logData.stack = error.stack;
          }

          // Use the appropriate logger method based on log level
          if (logLevel === 'error') {
            logger.error(logMessage, logData);
          } else if (logLevel === 'warn') {
            logger.warn(logMessage, logData);
          } else {
            // Default to info for 'http' or any other level
            logger.info(logMessage, logData);
          }

          // Log detailed debug info separately
          logger.debug('Detailed request information:', {
            request: {
              body: isBinaryData ? '[Binary data not logged]' : expressReq.body,
              headers: expressReq.headers,
              query: expressReq.query,
              params: expressReq.params
            },
            response: resBody,
            stack: error?.stack
          });
        } else {
          // Use the appropriate logger method based on log level
          if (logLevel === 'error') {
            logger.error(logMessage, logData);
          } else if (logLevel === 'warn') {
            logger.warn(logMessage, logData);
          } else {
            // Default to info for 'http' or any other level
            logger.info(logMessage, logData);
          }
        }

        // Handle the original end call with proper type handling
        if (typeof encoding === 'function') {
          // When encoding is a function, it's actually the callback
          return originalEnd.call(
            this,
            chunk as Buffer | string | undefined,
            null as unknown as BufferEncoding,
            encoding
          );
        }
        return originalEnd.call(
          this,
          chunk as Buffer | string | undefined,
          encoding as BufferEncoding,
          callback
        );
      };

      next();
    }
  ];
}
