import mongoose, { Document } from 'mongoose';
import { Item } from '@dungeon-lab/shared';
/**
 * Item document interface
 */
export interface ItemDocument extends Omit<Item, 'id'>, Document {
    id: string;
}
/**
 * Item model
 */
export declare const ItemModel: mongoose.Model<ItemDocument, {}, {}, {}, mongoose.Document<unknown, {}, ItemDocument> & ItemDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
