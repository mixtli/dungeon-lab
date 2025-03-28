import { z } from 'zod';

/**
 * Interface for the API provided to plugin components
 * Provides domain-specific methods for managing actors and items
 */
export interface IPluginAPI {
  // Actor management
  createActor(type: string, data: unknown): Promise<string>;
  getActor(id: string): Promise<unknown>;
  updateActor(id: string, data: unknown): Promise<void>;
  deleteActor(id: string): Promise<void>;
  
  // Item management
  createItem(type: string, data: unknown): Promise<string>;
  getItem(id: string): Promise<unknown>;
  updateItem(id: string, data: unknown): Promise<void>;
  deleteItem(id: string): Promise<void>;

  // Document management
  getDocument(pluginId: string, documentType: string, documentId: string): Promise<unknown>;
  searchDocuments(params: Record<string, string>): Promise<unknown[]>;

  // Data validation
  validateActorData(type: string, data: unknown): z.SafeParseReturnType<unknown, unknown>;
  validateItemData(type: string, data: unknown): z.SafeParseReturnType<unknown, unknown>;

  // Plugin state management
  getPluginState(): Record<string, unknown>;
  updatePluginState(update: Record<string, unknown>): void;

  // Plugin messaging
  sendPluginMessage(type: string, data: unknown): void;
  onPluginMessage(type: string, handler: (data: unknown) => void): void;
} 