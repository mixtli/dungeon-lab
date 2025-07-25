import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';

export interface ValidationResult {
  success: boolean;
  error?: Error;
  data?: unknown;
}

export class CompendiumValidationService {
  /**
   * Validate actor data against plugin schema
   */
  async validateActorData(
    pluginId: string,
    actorType: string,
    data: unknown
  ): Promise<ValidationResult> {
    try {
      const plugin = pluginRegistry.getPlugin(pluginId);
      if (!plugin) {
        return {
          success: false,
          error: new Error(`Plugin ${pluginId} not found`)
        };
      }

      return plugin.validateActorData?.(actorType, data) || { success: true, data };
    } catch (error) {
      logger.error('Error validating actor data:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Validate item data against plugin schema
   */
  async validateItemData(
    pluginId: string,
    itemType: string,
    data: unknown
  ): Promise<ValidationResult> {
    try {
      const plugin = pluginRegistry.getPlugin(pluginId);
      if (!plugin) {
        return {
          success: false,
          error: new Error(`Plugin ${pluginId} not found`)
        };
      }

      return plugin.validateItemData?.(itemType, data) || { success: true, data };
    } catch (error) {
      logger.error('Error validating item data:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Validate VTT document data against plugin schema
   */
  async validateVTTDocumentData(
    pluginId: string,
    documentType: string,
    data: unknown
  ): Promise<ValidationResult> {
    try {
      const plugin = pluginRegistry.getPlugin(pluginId);
      if (!plugin) {
        return {
          success: false,
          error: new Error(`Plugin ${pluginId} not found`)
        };
      }

      return plugin.validateVTTDocumentData?.(documentType, data) || { success: true, data };
    } catch (error) {
      logger.error('Error validating VTT document data:', error);
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Validate content data based on content type
   */
  async validateContentData(
    contentType: 'Actor' | 'Item' | 'VTTDocument',
    pluginId: string,
    subtype: string,
    data: unknown
  ): Promise<ValidationResult> {
    switch (contentType) {
      case 'Actor':
        return this.validateActorData(pluginId, subtype, data);
      case 'Item':
        return this.validateItemData(pluginId, subtype, data);
      case 'VTTDocument':
        return this.validateVTTDocumentData(pluginId, subtype, data);
      default:
        return {
          success: false,
          error: new Error(`Unknown content type: ${contentType}`)
        };
    }
  }

  /**
   * Validate a batch of content items
   */
  async validateBatch(items: Array<{
    contentType: 'Actor' | 'Item' | 'VTTDocument';
    pluginId: string;
    subtype: string;
    data: unknown;
    name?: string;
  }>): Promise<Array<ValidationResult & { index: number; name?: string }>> {
    const results = await Promise.all(
      items.map(async (item, index) => {
        const result = await this.validateContentData(
          item.contentType,
          item.pluginId,
          item.subtype,
          item.data
        );
        return {
          ...result,
          index,
          name: item.name
        };
      })
    );

    return results;
  }

  /**
   * Get validation summary for a batch
   */
  getBatchValidationSummary(results: Array<ValidationResult & { index: number; name?: string }>) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    
    return {
      total,
      successful,
      failed: failed.length,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      errors: failed.map(f => ({
        index: f.index,
        name: f.name,
        error: f.error?.message || 'Unknown error'
      }))
    };
  }

  /**
   * Validate compendium metadata
   */
  validateCompendiumMetadata(data: {
    pluginId: string;
    name: string;
    description?: string;
    [key: string]: unknown; // Allow additional properties
  }): ValidationResult {
    try {
      // Check if plugin exists
      const plugin = pluginRegistry.getPlugin(data.pluginId);
      if (!plugin) {
        return {
          success: false,
          error: new Error(`Plugin ${data.pluginId} not found`)
        };
      }

      // Validate required fields
      if (!data.name || data.name.trim().length === 0) {
        return {
          success: false,
          error: new Error('Compendium name is required')
        };
      }

      if (data.name.length > 255) {
        return {
          success: false,
          error: new Error('Compendium name must be 255 characters or less')
        };
      }

      if (!data.pluginId || (typeof data.pluginId === 'string' && data.pluginId.trim().length === 0)) {
        return {
          success: false,
          error: new Error('Plugin ID is required')
        };
      }

      // Additional validations can be added here
      
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }
}

export const compendiumValidationService = new CompendiumValidationService();