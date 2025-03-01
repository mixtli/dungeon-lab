import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
/**
 * User schema
 */
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId; // Password not required if using Google OAuth
        },
        minlength: 6,
    },
    displayName: {
        type: String,
        trim: true,
    },
    avatar: {
        type: String,
        trim: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true,
    },
    roles: {
        type: [String],
        default: ['user'],
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system',
        },
        language: {
            type: String,
            default: 'en',
        },
        notifications: {
            type: Boolean,
            default: true,
        },
    },
    lastLogin: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (_, ret) => {
            delete ret.password; // Don't include password in JSON
            return {
                ...ret,
                id: ret._id,
                _id: undefined,
                __v: undefined,
            };
        },
    },
});
/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
    const user = this;
    // Only hash the password if it has been modified or is new
    if (!user.isModified('password') || !user.password) {
        return next();
    }
    try {
        // Generate salt
        const salt = await bcrypt.genSalt(10);
        // Hash password
        user.password = await bcrypt.hash(user.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcrypt.compare(candidatePassword, this.password);
};
/**
 * User model
 */
export const UserModel = mongoose.model('User', userSchema);
//# sourceMappingURL=user.model.js.map