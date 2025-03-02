/**
 * API Response interface
 * This interface defines the structure of an API response
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}
/**
 * API Error interface
 * This interface defines the structure of an API error
 */
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}
/**
 * Pagination interface
 * This interface defines the structure of pagination data
 */
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
/**
 * Paginated API Response interface
 * This interface defines the structure of a paginated API response
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
    pagination?: Pagination;
}
//# sourceMappingURL=api.d.ts.map