/**
 * Campaign Status
 */
export type CampaignStatus = 'planning' | 'active' | 'completed' | 'archived';

/**
 * Campaign interface
 * This interface defines the structure of a campaign
 */
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  gameSystemId: string;
  status: CampaignStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  settings?: Record<string, unknown>;
}

/**
 * Campaign Creation DTO
 */
export interface CreateCampaignDto {
  name: string;
  description?: string;
  gameSystemId: string;
  status?: CampaignStatus;
  settings?: Record<string, unknown>;
}

/**
 * Campaign Update DTO
 */
export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  settings?: Record<string, unknown>;
} 