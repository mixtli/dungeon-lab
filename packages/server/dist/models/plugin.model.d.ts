import mongoose, { Document } from 'mongoose';
import { Plugin } from '@dungeon-lab/shared';
/**
 * Plugin document interface
 */
export interface PluginDocument extends Omit<Plugin, 'id'>, Document {
    id: string;
}
/**
 * Plugin model
 */
export declare const PluginModel: mongoose.Model<PluginDocument, {}, {}, {}, mongoose.Document<unknown, {}, PluginDocument> & PluginDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
