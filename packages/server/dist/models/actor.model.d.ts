import mongoose, { Document } from 'mongoose';
import { Actor } from '@dungeon-lab/shared';
/**
 * Actor document interface
 */
export interface ActorDocument extends Omit<Actor, 'id'>, Document {
    id: string;
}
/**
 * Actor model
 */
export declare const ActorModel: mongoose.Model<ActorDocument, {}, {}, {}, mongoose.Document<unknown, {}, ActorDocument> & ActorDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
