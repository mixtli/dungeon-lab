import mongoose, { Document } from 'mongoose';
import { GameSystem, GameSystemActorType, GameSystemItemType } from '@dungeon-lab/shared';
/**
 * Game System Actor Type document interface
 */
export interface GameSystemActorTypeDocument extends Omit<GameSystemActorType, 'id'>, Document {
    id: string;
}
/**
 * Game System Item Type document interface
 */
export interface GameSystemItemTypeDocument extends Omit<GameSystemItemType, 'id'>, Document {
    id: string;
}
/**
 * Game System document interface
 */
export interface GameSystemDocument extends Omit<GameSystem, 'id' | 'actorTypes' | 'itemTypes'>, Document {
    id: string;
    actorTypes: GameSystemActorTypeDocument[];
    itemTypes: GameSystemItemTypeDocument[];
}
/**
 * Game System model
 */
export declare const GameSystemModel: mongoose.Model<GameSystemDocument, {}, {}, {}, mongoose.Document<unknown, {}, GameSystemDocument> & GameSystemDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
