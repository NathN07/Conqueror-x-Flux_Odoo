import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: formattedIssues,
      },
    });
    return;
  }

  // Handle JSON parse errors
  if ('type' in err && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload provided in request body',
      },
    });
    return;
  }

  // Handle Prisma unique constraint violations (P2002)
  if ('code' in err && (err as { code?: string }).code === 'P2002') {
    const target = (err as { meta?: { target?: string[] } }).meta?.target;
    res.status(409).json({
      error: {
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: `A record with this ${target ? target.join(', ') : 'unique field'} already exists.`,
      },
    });
    return;
  }

  // Handle Prisma record not found (P2025)
  if ('code' in err && (err as { code?: string }).code === 'P2025') {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
    });
    return;
  }

  // Default fallback for unexpected errors
  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
};
