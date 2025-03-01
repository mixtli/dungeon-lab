import mongoose, { Schema } from 'mongoose';
/**
 * Plugin schema
 */
const pluginSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    version: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    author: {
        type: String,
        trim: true,
    },
    website: {
        type: String,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['gameSystem', 'extension', 'theme'],
        default: 'gameSystem',
    },
    enabled: {
        type: Boolean,
        default: true,
    },
    entryPoint: {
        type: String,
        required: true,
        trim: true,
    },
    gameSystemId: {
        type: Schema.Types.ObjectId,
        ref: 'GameSystem',
        required: function () {
            return this.type === 'gameSystem';
        },
    },
    config: {
        type: Schema.Types.Mixed,
        default: {},
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
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
});
/**
 * Plugin model
 */
export const PluginModel = mongoose.model('Plugin', pluginSchema);
//# sourceMappingURL=plugin.model.js.map