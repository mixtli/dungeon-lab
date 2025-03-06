/**
 * This file provides type extensions for MongoDB documents
 * to include the _id and other fields that are added by MongoDB
 * but not defined in our Zod schemas
 */

import { Types } from 'mongoose';

// Augment the mongoose ObjectId type
declare global {
    type ObjectId = Types.ObjectId;
}

// Type for MongoDB documents that includes _id and timestamps
export type WithMongoId<T> = T & {
    _id: string | ObjectId;
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}; 