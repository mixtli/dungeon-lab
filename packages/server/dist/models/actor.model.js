import mongoose, { Schema } from 'mongoose';
/**
 * Actor schema
 */
const actorSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        trim: true,
    },
    img: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    gameSystemId: {
        type: Schema.Types.ObjectId,
        ref: 'GameSystem',
        required: true,
    },
    data: {
        type: Schema.Types.Mixed,
        required: true,
        default: {},
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
 * Actor model
 */
export const ActorModel = mongoose.model('Actor', actorSchema);
//# sourceMappingURL=actor.model.js.map