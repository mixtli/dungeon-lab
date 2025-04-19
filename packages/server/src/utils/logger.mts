/**
 * Simple logger utility
 */
export const logger = {
  /**
   * Log an info message
   */
  info: (message: string, ...args: unknown[]): void => {
    console.info(`[INFO] ${message}`, ...args);
  },

  /**
   * Log a warning message
   */
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log an error message
   */
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Log a debug message
   */
  debug: (message: string, ...args: unknown[]): void => {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}; 