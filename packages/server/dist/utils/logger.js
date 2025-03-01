/**
 * Simple logger utility
 */
export const logger = {
    /**
     * Log an info message
     */
    info: (message, ...args) => {
        console.info(`[INFO] ${message}`, ...args);
    },
    /**
     * Log a warning message
     */
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    /**
     * Log an error message
     */
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    /**
     * Log a debug message
     */
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
};
//# sourceMappingURL=logger.js.map