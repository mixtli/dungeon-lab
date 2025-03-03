import mongoose, { Document, Schema } from 'mongoose';
import { Campaign, CampaignStatus } from '@dungeon-lab/shared';

/**
 * Campaign document interface
 */
export interface CampaignDocument extends Omit<Campaign, 'id'>, Document {
  id: string; // For virtual property
}

/**
 * Campaign schema
 */
const campaignSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    gameSystemId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'archived'],
      default: 'planning',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Campaign model
 */
export const CampaignModel = mongoose.model<CampaignDocument>('Campaign', campaignSchema); 