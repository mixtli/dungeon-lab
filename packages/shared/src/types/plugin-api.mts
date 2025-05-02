import { z } from 'zod';
import type { IActor, IItem, IVTTDocument } from './index.mjs';
import type { CreateActorRequest, CreateItemRequest, SearchDocumentsQuery } from './api/index.mjs';

/**
 * Interface for the API provided to plugin components
 * Provides domain-specific methods for managing actors and items
 */
export interface IPluginAPI {
  // Actor management
  createActor(type: string, data: CreateActorRequest): Promise<IActor>;
  getActor(id: string): Promise<IActor>;
  updateActor(id: string, data: CreateActorRequest): Promise<IActor>;
  deleteActor(id: string): Promise<void>;

  // Item management
  createItem(type: string, data: CreateItemRequest): Promise<IItem>;
  getItem(id: string): Promise<IItem>;
  updateItem(id: string, data: CreateItemRequest): Promise<IItem>;
  deleteItem(id: string): Promise<void>;

  // Document management
  getDocument(pluginId: string, documentType: string, documentId: string): Promise<IVTTDocument>;
  searchDocuments(query: SearchDocumentsQuery): Promise<IVTTDocument[]>;

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
