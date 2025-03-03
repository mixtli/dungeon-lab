import { Types } from 'mongoose';

export interface Map {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl: string;
  gridColumns: number;
  gridRows: number;
  aspectRatio: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMapDto {
  name: string;
  description?: string;
  gridColumns: number;
  image: File;
}

export interface UpdateMapDto {
  name?: string;
  description?: string;
  gridColumns?: number;
} 