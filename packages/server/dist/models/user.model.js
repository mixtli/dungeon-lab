"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * User schema
 */
const userSchema = new mongoose_1.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30,
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
        required: true,
        minlength: 8,
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
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        },
    },
});
/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
    // Cast to unknown first, then to UserDocument to avoid TypeScript error
    const user = this;
    // Only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) {
        return next();
    }
    try {
        // Generate a salt
        const salt = await bcrypt_1.default.genSalt(10);
        // Hash the password along with the new salt
        const hash = await bcrypt_1.default.hash(user.password, salt);
        // Override the cleartext password with the hashed one
        user.password = hash;
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
    return bcrypt_1.default.compare(candidatePassword, this.password);
};
/**
 * User model
 */
exports.UserModel = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=user.model.js.map