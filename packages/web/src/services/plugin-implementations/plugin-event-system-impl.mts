import type { PluginEventSystem } from '@dungeon-lab/shared/types/plugin-context.mjs';

/**
 * Concrete implementation of PluginEventSystem interface
 * Provides event bus for inter-plugin communication
 */
export class PluginEventSystemImpl implements PluginEventSystem {
  private events = new Map<string, Set<(data: unknown) => void>>();
  private pluginId: string;
  
  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }
  
  /**
   * Emit an event with optional data
   */
  emit<T = unknown>(event: string, data?: T): void {
    const listeners = this.events.get(event);
    if (listeners && listeners.size > 0) {
      console.log(`[PluginEventSystem:${this.pluginId}] Emitting event '${event}' to ${listeners.size} listeners`);
      
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`[PluginEventSystem:${this.pluginId}] Error in event listener for '${event}':`, error);
        }
      }
    } else {
      console.log(`[PluginEventSystem:${this.pluginId}] No listeners for event '${event}'`);
    }
  }
  
  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, handler: (data: T) => void): () => void {
    // Add handler to event listeners
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const eventListeners = this.events.get(event)!;
    const wrappedHandler = (data: unknown) => handler(data as T);
    eventListeners.add(wrappedHandler);
    
    console.log(`[PluginEventSystem:${this.pluginId}] Added listener for event '${event}' (${eventListeners.size} total)`);
    
    // Return unsubscribe function
    return () => {
      eventListeners.delete(wrappedHandler);
      if (eventListeners.size === 0) {
        this.events.delete(event);
      }
      console.log(`[PluginEventSystem:${this.pluginId}] Removed listener for event '${event}'`);
    };
  }
  
  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const count = listeners.size;
      this.events.delete(event);
      console.log(`[PluginEventSystem:${this.pluginId}] Removed all ${count} listeners for event '${event}'`);
    }
  }
  
  /**
   * Remove a specific listener for an event
   */
  removeListener(event: string): boolean {
    const listeners = this.events.get(event);
    if (listeners) {
      // We need to find the wrapped handler that matches the original
      // This is a limitation of the current design - we can't easily remove specific handlers
      // In practice, the return value from `on()` should be used for removal
      console.warn(`[PluginEventSystem:${this.pluginId}] removeListener() called but specific handler removal not supported. Use the unsubscribe function returned by on() instead.`);
      return false;
    }
    return false;
  }
  
  /**
   * Get list of events that have listeners
   */
  getEventNames(): string[] {
    return Array.from(this.events.keys());
  }
  
  /**
   * Get number of listeners for an event
   */
  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }
  
  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: string): boolean {
    const listeners = this.events.get(event);
    return listeners ? listeners.size > 0 : false;
  }
  
  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    const eventCount = this.events.size;
    let totalListeners = 0;
    
    for (const listeners of this.events.values()) {
      totalListeners += listeners.size;
    }
    
    this.events.clear();
    console.log(`[PluginEventSystem:${this.pluginId}] Removed all listeners (${totalListeners} listeners across ${eventCount} events)`);
  }
  
  /**
   * Get plugin ID this event system belongs to
   */
  getPluginId(): string {
    return this.pluginId;
  }
}