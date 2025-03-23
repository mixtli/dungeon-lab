import { z } from '../lib/zod.mjs';
import { IPlugin, IPluginConfiguration } from '../types/plugin.mjs';
import { IPluginMessage } from '../schemas/websocket-messages.schema.mjs';

export interface IPluginSchemas {
  [key: string]: z.ZodType<any>;
}

/**
 * Base Plugin class that implements IPlugin interface
 * Provides default implementations for plugin lifecycle hooks
 * This class is browser-compatible
 */
export abstract class BasePlugin implements IPlugin {
  public config: IPluginConfiguration;
  public type: 'gameSystem' | 'extension' | 'theme' | undefined;
  // Child classes will populate this with their schemas
  protected schemas: IPluginSchemas = {};

  constructor(config: IPluginConfiguration) {
    this.config = config;
  }

  async onLoad(): Promise<void> {
    console.log(`[${this.config.name}] Plugin loaded`);
  }

  async onUnload(): Promise<void> {
    console.log(`[${this.config.name}] Plugin unloaded`);
  }

  async onRegister(): Promise<void> {
    console.log(`[${this.config.name}] Plugin registered`);
  }

  async handlePluginMessage(message: IPluginMessage): Promise<void> {
    console.log(`[${this.config.name}] Plugin message received: ${JSON.stringify(message)}`);
  }

  // Schema management methods
  
  /**
   * Get a schema by document type
   */
  getSchema(documentType: string): z.ZodType<any> | undefined {
    return this.schemas[documentType];
  }

  /**
   * Get all available document types
   */
  getDocumentTypes(): string[] {
    return Object.keys(this.schemas);
  }

  /**
   * Validate data against a schema
   */
  async validateData(documentType: string, data: any): Promise<boolean> {
    const schema = this.getSchema(documentType);
    if (!schema) {
      throw new Error(`No schema found for document type ${documentType} in plugin ${this.config.name}`);
    }

    try {
      await schema.parseAsync(data);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw error;
      }
      return false;
    }
  }
} 