import mongoose, { Document } from 'mongoose';
/**
 * User interface
 */
export interface User {
    id: string;
    username: string;
    email: string;
    password?: string;
    googleId?: string;
    displayName?: string;
    avatar?: string;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * User document interface
 */
export interface UserDocument extends Document {
    username: string;
    email: string;
    password?: string;
    displayName?: string;
    avatar?: string;
    isAdmin: boolean;
    googleId?: string;
    roles: string[];
    preferences: {
        theme: 'light' | 'dark' | 'system';
        language: string;
        notifications: boolean;
    };
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
/**
 * User model
 */
export declare const UserModel: mongoose.Model<UserDocument, {}, {}, {}, mongoose.Document<unknown, {}, UserDocument> & UserDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
