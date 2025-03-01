import mongoose, { Document } from 'mongoose';
import { GameSystem } from '@dungeon-lab/shared';
/**
 * GameSystem document interface
 */
export interface GameSystemDocument extends Omit<GameSystem, 'id'>, Document {
    id: string;
}
/**
 * GameSystem model
 */
export declare const GameSystemModel: mongoose.Model<GameSystemDocument, {}, {}, {}, mongoose.Document<unknown, {}, GameSystemDocument> & GameSystemDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
