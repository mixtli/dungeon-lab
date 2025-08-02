import type { PluginStore } from '@dungeon-lab/shared/types/plugin-context.mjs';

/**
 * Concrete implementation of PluginStore interface
 * Provides reactive state management for plugins
 */
export class PluginStoreImpl implements PluginStore {
  private store = new Map<string, unknown>();
  private subscribers = new Map<string, Set<(value: unknown) => void>>();
  
  /**
   * Get a value from the store
   */
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  
  /**
   * Set a value in the store
   */
  set<T>(key: string, value: T): void {
    const previousValue = this.store.get(key);
    this.store.set(key, value);
    
    // Notify subscribers if value changed
    if (previousValue !== value) {
      this.notifySubscribers(key, value);
    }
  }
  
  /**
   * Subscribe to changes for a specific key
   */
  subscribe<T>(key: string, callback: (value: T) => void): () => void {
    // Add callback to subscribers
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    const keySubscribers = this.subscribers.get(key)!;
    const wrappedCallback = (value: unknown) => callback(value as T);
    keySubscribers.add(wrappedCallback);
    
    // Call callback immediately with current value if it exists
    const currentValue = this.store.get(key);
    if (currentValue !== undefined) {
      callback(currentValue as T);
    }
    
    // Return unsubscribe function
    return () => {
      keySubscribers.delete(wrappedCallback);
      if (keySubscribers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }
  
  /**
   * Check if a key exists in the store
   */
  has(key: string): boolean {
    return this.store.has(key);
  }
  
  /**
   * Delete a key from the store
   */
  delete(key: string): boolean {
    const existed = this.store.has(key);
    if (existed) {
      this.store.delete(key);
      this.notifySubscribers(key, undefined);
    }
    return existed;
  }
  
  /**
   * Clear all values from the store
   */
  clear(): void {
    const keys = Array.from(this.store.keys());
    this.store.clear();
    
    // Notify all subscribers that their values are now undefined
    for (const key of keys) {
      this.notifySubscribers(key, undefined);
    }
  }
  
  /**
   * Get all keys in the store
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }
  
  /**
   * Get the number of items in the store
   */
  size(): number {
    return this.store.size;
  }
  
  /**
   * Get all entries as an object
   */
  toObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of this.store.entries()) {
      obj[key] = value;
    }
    return obj;
  }
  
  /**
   * Notify subscribers about a value change
   */
  private notifySubscribers(key: string, value: unknown): void {
    const keySubscribers = this.subscribers.get(key);
    if (keySubscribers) {
      for (const callback of keySubscribers) {
        try {
          callback(value);
        } catch (error) {
          console.error(`[PluginStore] Error in subscriber callback for key '${key}':`, error);
        }
      }
    }
  }
}