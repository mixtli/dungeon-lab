import { Schema, model } from 'mongoose';
import { Map } from '@dungeon-lab/shared';

const mapSchema = new Schema<Map>(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    gridColumns: { type: Number, required: true },
    gridRows: { type: Number, required: true },
    aspectRatio: { type: Number, required: true },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const MapModel = model<Map>('Map', mapSchema); 