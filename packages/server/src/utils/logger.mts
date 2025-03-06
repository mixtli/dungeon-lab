/**
 * Simple logger utility
 */
export const logger = {
  /**
   * Log an info message
   */
  info: (message: string, ...args: any[]): void => {
    console.info(`[INFO] ${message}`, ...args);
  },

  /**
   * Log a warning message
   */
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log an error message
   */
  error: (message: string, ...args: any[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Log a debug message
   */
  debug: (message: string, ...args: any[]): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}; 