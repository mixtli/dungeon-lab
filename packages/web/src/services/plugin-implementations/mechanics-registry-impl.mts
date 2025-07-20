import type { 
  MechanicsRegistry, 
  MechanicEntry, 
  MechanicMetadata, 
  GameMechanic 
} from '@dungeon-lab/shared/types/mechanics-registry.mjs';

/**
 * Concrete implementation of MechanicsRegistry interface
 * Manages game mechanics for plugins
 */
export class MechanicsRegistryImpl implements MechanicsRegistry {
  private mechanics = new Map<string, MechanicEntry>();
  
  /**
   * Register a game mechanic
   */
  register(id: string, mechanic: GameMechanic, metadata?: MechanicMetadata): void {
    if (this.mechanics.has(id)) {
      console.warn(`Mechanic with id '${id}' already exists, overwriting`);
    }
    
    const entry: MechanicEntry = {
      id,
      mechanic,
      metadata: metadata || {
        pluginId: 'unknown',
        name: mechanic.name || id,
        description: mechanic.description
      }
    };
    
    this.mechanics.set(id, entry);
    console.log(`[MechanicsRegistry] Registered mechanic '${id}' (${mechanic.name}) for plugin '${entry.metadata.pluginId}'`);
  }
  
  /**
   * Get a registered mechanic by ID
   */
  get(id: string): GameMechanic | undefined {
    const entry = this.mechanics.get(id);
    return entry?.mechanic;
  }
  
  /**
   * Get all registered mechanics for a plugin
   */
  getByPlugin(pluginId: string): MechanicEntry[] {
    const entries: MechanicEntry[] = [];
    
    for (const entry of this.mechanics.values()) {
      if (entry.metadata.pluginId === pluginId) {
        entries.push(entry);
      }
    }
    
    return entries;
  }
  
  /**
   * Unregister a mechanic
   */
  unregister(id: string): void {
    const entry = this.mechanics.get(id);
    if (entry) {
      this.mechanics.delete(id);
      console.log(`[MechanicsRegistry] Unregistered mechanic '${id}' from plugin '${entry.metadata.pluginId}'`);
    }
  }
  
  /**
   * Unregister all mechanics for a plugin
   */
  unregisterByPlugin(pluginId: string): void {
    const mechanicsToRemove: string[] = [];
    
    for (const [id, entry] of this.mechanics.entries()) {
      if (entry.metadata.pluginId === pluginId) {
        mechanicsToRemove.push(id);
      }
    }
    
    for (const id of mechanicsToRemove) {
      this.mechanics.delete(id);
    }
    
    console.log(`[MechanicsRegistry] Unregistered ${mechanicsToRemove.length} mechanics for plugin '${pluginId}'`);
  }
  
  /**
   * Get all registered mechanics
   */
  list(): MechanicEntry[] {
    return Array.from(this.mechanics.values());
  }
  
  /**
   * Get mechanics by category
   */
  getByCategory(category: string): MechanicEntry[] {
    const entries: MechanicEntry[] = [];
    
    for (const entry of this.mechanics.values()) {
      if (entry.metadata.category === category) {
        entries.push(entry);
      }
    }
    
    return entries;
  }
  
  /**
   * Get the number of registered mechanics
   */
  size(): number {
    return this.mechanics.size;
  }
  
  /**
   * Check if a mechanic is registered
   */
  has(id: string): boolean {
    return this.mechanics.has(id);
  }
  
  /**
   * Clear all registered mechanics
   */
  clear(): void {
    const count = this.mechanics.size;
    this.mechanics.clear();
    console.log(`[MechanicsRegistry] Cleared ${count} mechanics`);
  }
}