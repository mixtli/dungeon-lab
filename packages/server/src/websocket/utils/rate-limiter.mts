import { logger } from '../../utils/logger.mjs';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface UserRateLimit {
  requests: number[];
  lastReset: number;
}

export class SocketRateLimiter {
  private limits: Map<string, UserRateLimit> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a user has exceeded the rate limit
   */
  isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit) {
      // First request for this user
      this.limits.set(userId, {
        requests: [now],
        lastReset: now
      });
      return false;
    }

    // Remove requests outside the window
    const windowStart = now - this.config.windowMs;
    userLimit.requests = userLimit.requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (userLimit.requests.length >= this.config.maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}`, {
        requests: userLimit.requests.length,
        maxRequests: this.config.maxRequests,
        windowMs: this.config.windowMs
      });
      return true;
    }

    // Add current request
    userLimit.requests.push(now);
    userLimit.lastReset = now;
    
    return false;
  }

  /**
   * Get remaining requests for a user
   */
  getRemainingRequests(userId: string): number {
    const userLimit = this.limits.get(userId);
    if (!userLimit) {
      return this.config.maxRequests;
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const validRequests = userLimit.requests.filter(time => time > windowStart);
    
    return Math.max(0, this.config.maxRequests - validRequests.length);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs * 2; // Keep data for 2 windows

    for (const [userId, userLimit] of this.limits.entries()) {
      if (userLimit.lastReset < cutoff) {
        this.limits.delete(userId);
      }
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  reset(userId: string): void {
    this.limits.delete(userId);
  }
}

// Pre-configured rate limiters for different types of operations
export const encounterRateLimiters = {
  // Token movement - allow frequent updates but prevent spam
  tokenMove: new SocketRateLimiter({
    maxRequests: 30,
    windowMs: 60000, // 30 moves per minute
    message: 'Too many token movements. Please slow down.'
  }),

  // Combat actions - more restrictive
  actions: new SocketRateLimiter({
    maxRequests: 10,
    windowMs: 60000, // 10 actions per minute
    message: 'Too many combat actions. Please wait before performing more actions.'
  }),

  // Encounter updates - very restrictive
  encounterUpdates: new SocketRateLimiter({
    maxRequests: 20,
    windowMs: 60000, // 20 updates per minute
    message: 'Too many encounter updates. Please slow down.'
  }),

  // Initiative operations
  initiative: new SocketRateLimiter({
    maxRequests: 15,
    windowMs: 60000, // 15 initiative operations per minute
    message: 'Too many initiative operations. Please wait.'
  }),

  // General encounter operations
  general: new SocketRateLimiter({
    maxRequests: 50,
    windowMs: 60000, // 50 general operations per minute
    message: 'Too many requests. Please slow down.'
  })
}; 