import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Extracts and calculates pagination parameters from query string.
 * Defaults: page=1, limit=10, max limit=100
 */
export function getPaginationParams(req: Request, defaultLimit = 10, maxLimit = 100): PaginationParams {
  const pageQuery = parseInt(req.query.page as string, 10);
  const limitQuery = parseInt(req.query.limit as string, 10);

  const page = Number.isInteger(pageQuery) && pageQuery > 0 ? pageQuery : 1;
  let limit = Number.isInteger(limitQuery) && limitQuery > 0 ? limitQuery : defaultLimit;

  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

/**
 * Formats data into standard pagination payload { data, page, limit, total }
 */
export function formatPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    page,
    limit,
    total,
  };
}
