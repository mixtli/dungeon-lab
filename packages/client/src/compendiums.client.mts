import type { 
  ICompendium, 
  ICompendiumCreateData, 
  ICompendiumUpdateData,
  ICompendiumEntry,
  ICompendiumEntryCreateData,
  ICompendiumEntryUpdateData,
  IEmbeddedContent
} from '@dungeon-lab/shared/types/index.mjs';
import type { ImportJob, ValidationResult } from '@dungeon-lab/shared/schemas/import.schema.mjs';
import { ApiClient } from './api.client.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Client for interacting with the compendiums API
 */
export class CompendiumsClient extends ApiClient {
  /**
   * Get all compendiums with optional filtering
   */
  async getCompendiums(params?: Record<string, string | number | boolean>): Promise<ICompendium[]> {
    const response = await this.api.get<BaseAPIResponse<ICompendium[]>>('/api/compendiums', { params });
    if (!response.data) {
      throw new Error('Failed to get compendiums');
    }
    return response.data.data;
  }

  /**
   * Get a compendium by ID
   */
  async getCompendium(compendiumId: string): Promise<ICompendium> {
    const response = await this.api.get<BaseAPIResponse<ICompendium>>(`/api/compendiums/${compendiumId}`);
    if (!response.data) {
      throw new Error('Failed to get compendium');
    }
    return response.data.data;
  }

  /**
   * Create a new compendium
   */
  async createCompendium(data: ICompendiumCreateData): Promise<ICompendium> {
    const response = await this.api.post<BaseAPIResponse<ICompendium>>('/api/compendiums', data);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to create compendium');
    }
    return response.data.data;
  }

  /**
   * Update a compendium
   */
  async updateCompendium(compendiumId: string, data: ICompendiumUpdateData): Promise<ICompendium> {
    const response = await this.api.put<BaseAPIResponse<ICompendium>>(`/api/compendiums/${compendiumId}`, data);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to update compendium');
    }
    return response.data.data;
  }

  /**
   * Delete a compendium
   */
  async deleteCompendium(compendiumId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/compendiums/${compendiumId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete compendium');
    }
  }

  /**
   * Get entries in a compendium with optional filtering
   */
  async getCompendiumEntries(compendiumId: string, params?: Record<string, string | number | boolean>): Promise<{
    entries: ICompendiumEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await this.api.get<BaseAPIResponse<{
      entries: ICompendiumEntry[];
      total: number;
      page: number;
      limit: number;
    }>>(`/api/compendiums/${compendiumId}/entries`, { params });
    if (!response.data) {
      throw new Error('Failed to get compendium entries');
    }
    return response.data.data;
  }

  /**
   * Get a specific compendium entry
   */
  async getCompendiumEntry(entryId: string): Promise<ICompendiumEntry> {
    const response = await this.api.get<BaseAPIResponse<ICompendiumEntry>>(`/api/compendiums/entries/${entryId}`);
    if (!response.data) {
      throw new Error('Failed to get compendium entry');
    }
    return response.data.data;
  }

  /**
   * Create a new compendium entry
   */
  async createCompendiumEntry(compendiumId: string, data: ICompendiumEntryCreateData): Promise<ICompendiumEntry> {
    const response = await this.api.post<BaseAPIResponse<ICompendiumEntry>>(`/api/compendiums/${compendiumId}/entries`, data);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to create compendium entry');
    }
    return response.data.data;
  }

  /**
   * Update a compendium entry
   */
  async updateCompendiumEntry(entryId: string, data: ICompendiumEntryUpdateData): Promise<ICompendiumEntry> {
    const response = await this.api.put<BaseAPIResponse<ICompendiumEntry>>(`/api/compendiums/entries/${entryId}`, data);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to update compendium entry');
    }
    return response.data.data;
  }

  /**
   * Delete a compendium entry
   */
  async deleteCompendiumEntry(entryId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/compendiums/entries/${entryId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete compendium entry');
    }
  }

  /**
   * Link existing content to a compendium
   */
  async linkContent(compendiumId: string, data: { contentType: 'Actor' | 'Item' | 'VTTDocument', contentId: string, name: string }): Promise<ICompendiumEntry> {
    const response = await this.api.post<BaseAPIResponse<ICompendiumEntry>>(`/api/compendiums/${compendiumId}/link`, data);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to link content to compendium');
    }
    return response.data.data;
  }

  /**
   * Unlink content from a compendium
   */
  async unlinkContent(entryId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/compendiums/entries/${entryId}/unlink`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to unlink content from compendium');
    }
  }

  /**
   * Get compendium statistics
   */
  async getCompendiumStats(compendiumId: string): Promise<{ totalEntries: number, entriesByType: Record<string, number> }> {
    const response = await this.api.get<BaseAPIResponse<{ totalEntries: number, entriesByType: Record<string, number> }>>(`/api/compendiums/${compendiumId}/stats`);
    if (!response.data) {
      throw new Error('Failed to get compendium statistics');
    }
    return response.data.data;
  }

  /**
   * Import compendium from ZIP file
   */
  async importFromZip(data: FormData): Promise<ImportJob> {
    const response = await this.api.post<BaseAPIResponse<ImportJob>>('/api/compendiums/import', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to start import');
    }
    
    return response.data.data;
  }

  /**
   * Get import job status
   */
  async getImportJobStatus(jobId: string): Promise<ImportJob> {
    const response = await this.api.get<BaseAPIResponse<ImportJob>>(`/api/compendiums/import/${jobId}/status`);
    if (!response.data) {
      throw new Error('Failed to get import job status');
    }
    return response.data.data;
  }

  /**
   * Validate ZIP file structure without importing
   */
  async validateZip(data: FormData): Promise<ValidationResult> {
    const response = await this.api.post<BaseAPIResponse<ValidationResult>>('/api/compendiums/validate', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to validate ZIP file');
    }
    
    return response.data.data;
  }

  /**
   * Cancel a pending import job
   */
  async cancelImportJob(jobId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/compendiums/import/${jobId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to cancel import job');
    }
  }

  /**
   * Get all import jobs for the current user
   */
  async getImportJobs(): Promise<ImportJob[]> {
    const response = await this.api.get<BaseAPIResponse<ImportJob[]>>('/api/compendiums/import/jobs');
    if (!response.data) {
      throw new Error('Failed to get import jobs');
    }
    return response.data.data;
  }

  /**
   * Instantiate a template from a compendium entry
   */
  async instantiateTemplate(compendiumId: string, entryId: string, overrides?: Record<string, unknown>): Promise<IEmbeddedContent> {
    const response = await this.api.post<BaseAPIResponse<IEmbeddedContent>>(`/api/compendiums/${compendiumId}/entries/${entryId}/instantiate`, {
      overrides: overrides || {}
    });
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to instantiate template');
    }
    return response.data.data;
  }

  /**
   * Get template content
   */
  async getTemplate(compendiumId: string, entryId: string): Promise<{ entryId: string; contentType: string; templateData: IEmbeddedContent }> {
    const response = await this.api.get<BaseAPIResponse<{ entryId: string; contentType: string; templateData: IEmbeddedContent }>>(`/api/compendiums/${compendiumId}/entries/${entryId}/template`);
    if (!response.data) {
      throw new Error('Failed to get template');
    }
    return response.data.data;
  }

  /**
   * Update template content
   */
  async updateTemplate(compendiumId: string, entryId: string, templateData: IEmbeddedContent): Promise<IEmbeddedContent> {
    const response = await this.api.put<BaseAPIResponse<IEmbeddedContent>>(`/api/compendiums/${compendiumId}/entries/${entryId}/template`, templateData);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to update template');
    }
    return response.data.data;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(compendiumId: string, entryId: string): Promise<{ totalUsages: number; recentUsages: Array<{ userId: string; createdAt: string; instanceId: string }> }> {
    const response = await this.api.get<BaseAPIResponse<{ totalUsages: number; recentUsages: Array<{ userId: string; createdAt: string; instanceId: string }> }>>(`/api/compendiums/${compendiumId}/entries/${entryId}/usage`);
    if (!response.data) {
      throw new Error('Failed to get template usage');
    }
    return response.data.data;
  }
}