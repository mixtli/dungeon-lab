/**
 * Simple logger utility
 */
export declare const logger: {
    /**
     * Log an info message
     */
    info: (message: string, ...args: any[]) => void;
    /**
     * Log a warning message
     */
    warn: (message: string, ...args: any[]) => void;
    /**
     * Log an error message
     */
    error: (message: string, ...args: any[]) => void;
    /**
     * Log a debug message
     */
    debug: (message: string, ...args: any[]) => void;
};
