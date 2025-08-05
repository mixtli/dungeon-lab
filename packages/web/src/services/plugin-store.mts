/**
 * Plugin Store Implementation
 * 
 * Provides reactive state management for plugin-specific UI state using Vue's reactivity system.
 * Each plugin gets its own isolated store instance for managing cross-component state.
 */

import { reactive, watch } from 'vue';
import type { PluginStore } from '@dungeon-lab/shared/types/plugin-context.mjs';

export class ReactivePluginStore implements PluginStore {
  private state = reactive(new Map<string, any>());
  private watchers = new Map<string, Set<(value: any) => void>>();

  get<T>(key: string): T | undefined {
    return this.state.get(key);
  }

  set<T>(key: string, value: T): void {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    
    // Notify subscribers if value actually changed
    if (oldValue !== value) {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback(value));
      }
    }
  }

  subscribe<T>(key: string, callback: (value: T) => void): () => void {
    // Initialize subscribers set for this key if it doesn't exist
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    // Add callback to subscribers
    this.watchers.get(key)!.add(callback);
    
    // Set up Vue watcher for reactivity
    const stopWatcher = watch(
      () => this.state.get(key),
      (newValue) => callback(newValue),
      { immediate: false }
    );
    
    // Return unsubscribe function that cleans up both the callback and Vue watcher
    return () => {
      this.watchers.get(key)?.delete(callback);
      stopWatcher();
    };
  }

  /**
   * Clear all data in the store (useful for cleanup)
   */
  clear(): void {
    this.state.clear();
    this.watchers.clear();
  }

  /**
   * Get all keys in the store (useful for debugging)
   */
  keys(): string[] {
    return Array.from(this.state.keys());
  }

  /**
   * Check if a key exists in the store
   */
  has(key: string): boolean {
    return this.state.has(key);
  }
}