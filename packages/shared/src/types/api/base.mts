/**
 * API Response interface
 * This interface defines the structure of an API response
 */
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: IApiError;
}

/**
 * API Error interface
 * This interface defines the structure of an API error
 */
export interface IApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Pagination interface
 * This interface defines the structure of pagination data
 */
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated API Response interface
 * This interface extends the API Response interface with pagination data
 */
export interface IPaginatedApiResponse<T> extends IApiResponse<T[]> {
  pagination?: IPagination;
} 