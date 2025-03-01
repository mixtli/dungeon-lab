import mongoose from 'mongoose';
/**
 * Connect to MongoDB
 */
export declare function connectToDatabase(): Promise<void>;
/**
 * Disconnect from MongoDB
 */
export declare function disconnectFromDatabase(): Promise<void>;
/**
 * Get the MongoDB connection
 */
export declare function getConnection(): mongoose.Connection;
